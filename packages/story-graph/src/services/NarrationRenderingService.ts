import { TextRenderer } from "@storyforge/llm-client";
import { StoryNode } from "../models/StoryNode";
import { StoryNodeRepository } from "../interfaces/StoryNodeRepository";
import { NarrativeQualityGate } from "./NarrativeQualityGate";

// Section 3: the ONLY place a node's narration is actually generated
// for deterministic-expansion-produced nodes. Called exactly once
// per node -- the first time it's actually reached -- never for
// branches the child doesn't visit.
//
// Properties from the correction pass:
//   A. Unvisited branches never reach this class at all (AdventureRuntime
//      only calls ensureRendered on the node it's currently resolving to).
//   B. A node with narrative already set short-circuits before any
//      renderer call.
//   C/D. Routing (template vs Gemini) is unchanged -- still the
//      LanguageRouter's job, passed in as `renderer` here.
//   E. Persisting the result via updateNode() is what makes a later
//      re-visit of the same node (if ever possible) reuse it instead
//      of re-rendering.
//   F. Canonical state (effects, emotion, choices) was already
//      persisted by DeterministicExpansionService BEFORE this class
//      ever runs -- narration failing here cannot corrupt any of that.
//   G. On renderer failure, a safe deterministic fallback (the raw
//      narrativeSeed) is used and persisted so play can continue;
//      the failure is logged, never silently swallowed.
//
// Phase 2B (Section K): a SUCCESSFUL renderer call is not
// automatically trusted. NarrativeQualityGate rejects obviously
// broken output (empty/truncated/tiny); on rejection this falls back
// to fallbackRenderer (the deterministic template renderer) --
// strictly NEVER a second Gemini call, to protect quota.
export class NarrationRenderingService {

    constructor(
        private readonly renderer: TextRenderer,
        private readonly storyNodeRepository: StoryNodeRepository,
        private readonly qualityGate: NarrativeQualityGate = new NarrativeQualityGate(),
        private readonly fallbackRenderer?: TextRenderer
    ) {}

    async ensureRendered(
        node: StoryNode
    ): Promise<StoryNode> {

        if (node.narrative) {
            return node;
        }

        if (!node.pendingRenderRequest) {

            throw new Error(
                `NarrationRenderingService: node '${node.id}' has no narrative and no pendingRenderRequest.`
            );

        }

        let narrative: string;

        try {

            const result = await this.renderer.render(node.pendingRenderRequest);

            if (this.qualityGate.isAcceptable(result.text)) {

                narrative = result.text;

            }
            else {

                console.warn(

                    "\n===== NarrationRenderingService: quality gate rejected output, using deterministic fallback =====\n" +
                    `nodeId: ${node.id}\n` +
                    `rejected: ${JSON.stringify(result.text)}\n` +
                    "====================================================================================================\n"

                );

                narrative = this.fallbackRenderer
                    ? (await this.fallbackRenderer.render(node.pendingRenderRequest)).text
                    : `${node.pendingRenderRequest.actorName} ${node.pendingRenderRequest.narrativeSeed}.`;

            }

        }
        catch (error) {

            console.error(

                "\n===== NarrationRenderingService: renderer failed, using safe fallback =====\n" +
                `nodeId: ${node.id}\n` +
                `error: ${error instanceof Error ? error.message : String(error)}\n` +
                "==============================================================================\n"

            );

            narrative =
                `${node.pendingRenderRequest.actorName} ${node.pendingRenderRequest.narrativeSeed}.`;

        }

        const rendered: StoryNode = {

            ...node,

            narrative,

            pendingRenderRequest: undefined

        };

        await this.storyNodeRepository.updateNode(rendered);

        return rendered;

    }

}
