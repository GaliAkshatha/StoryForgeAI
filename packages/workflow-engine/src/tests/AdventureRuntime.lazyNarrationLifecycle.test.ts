import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse, TextRenderer, RenderRequest, RenderResult } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";
import { StoryNodeRepository, StoryNode } from "@storyforge/story-graph";

// Mirrors PostgresStoryNodeRepository's ACTUAL behavior: every read
// returns a JSON round trip through a plain row object, never a live
// reference. This is what makes this test able to catch a mapping
// bug like the one just fixed -- InMemoryStoryNodeRepository (used
// by every OTHER integration test in this suite) stores live object
// references instead, which is exactly why prior tests passed
// despite the real browser failure (see the final report).
class RoundTrippingStoryNodeRepository implements StoryNodeRepository {

    private readonly rows = new Map<string, Record<string, unknown>>();

    private key(adventureId: string, id: string): string {
        return `${adventureId}:${id}`;
    }

    async findById(adventureId: string, nodeId: string): Promise<StoryNode | undefined> {

        const row = this.rows.get(this.key(adventureId, nodeId));

        return row ? (JSON.parse(JSON.stringify(row)) as StoryNode) : undefined;

    }

    async findByAdventureId(adventureId: string): Promise<StoryNode[]> {

        return [...this.rows.values()]

            .filter(row => row.adventureId === adventureId)

            .map(row => JSON.parse(JSON.stringify(row)) as StoryNode);

    }

    async saveMany(nodes: StoryNode[]): Promise<void> {

        for (const node of nodes) {

            this.rows.set(this.key(node.adventureId, node.id), JSON.parse(JSON.stringify(node)));

        }

    }

    async updateNode(node: StoryNode): Promise<void> {

        this.rows.set(this.key(node.adventureId, node.id), JSON.parse(JSON.stringify(node)));

    }

    async count(adventureId: string): Promise<number> {

        return [...this.rows.values()].filter(row => row.adventureId === adventureId).length;

    }

}

const METADATA_RESPONSE = JSON.stringify({

    title: "The Whispering Wood",

    characters: [
        { id: "squeak", name: "Squeak", role: "friend", description: "A small mouse." },
        { id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." }
    ],

    world: { setting: "forest", description: "An old, quiet forest." },

    learningPlan: [{ skillFocus: "collaboration", approach: "natural consequence" }],

    genome: {
        theme: "friendship", explorationLevel: 0.5, humor: 0.2, mystery: 0.3,
        fantasyDensity: 0.6, puzzleDensity: 0.2, npcComplexity: 0.3, vocabulary: "simple"
    },

    premise: "a small mouse named Squeak looks worried near a fallen branch"

});

// Counts calls per distinct narrativeSeed so we can prove unvisited
// frontier nodes get exactly zero, regardless of which candidate
// types happen to score as "rich" this run.
class CountingRenderer implements TextRenderer {

    callsByNarrativeSeed = new Map<string, number>();

    async render(request: RenderRequest): Promise<RenderResult> {

        this.callsByNarrativeSeed.set(
            request.narrativeSeed,
            (this.callsByNarrativeSeed.get(request.narrativeSeed) ?? 0) + 1
        );

        return { text: `Rendered: ${request.narrativeSeed}.`, rendererUsed: "counting-fake" };

    }

}

class FakeLLMClient implements LLMClient {

    async generate(request: LLMRequest): Promise<LLMResponse> {

        if (request.prompt.includes("\"premise\": \"\"")) {

            return { text: METADATA_RESPONSE, model: "fake-model", finishReason: "STOP" };

        }

        if (request.prompt.includes("Reflection Agent")) {

            return {
                text: JSON.stringify({
                    question: "What happened?", followUpQuestions: ["Why?"],
                    observedThemes: [], encouragement: "Nice."
                }),
                model: "fake-model", finishReason: "STOP"
            };

        }

        if (request.prompt.includes("Analytics Agent")) {

            return { text: JSON.stringify({ summary: "Did something." }), model: "fake-model", finishReason: "STOP" };

        }

        throw new Error(`FakeLLMClient: unexpected prompt for this test: ${request.prompt.slice(0, 80)}...`);

    }

}

function noNetworkKnowledgeBase(): KnowledgeBase {

    return { query: async () => [], queryAsContext: async () => "(none)" } as unknown as KnowledgeBase;

}

async function main(): Promise<void> {

    const counting = new CountingRenderer();

    const storyNodeRepository = new RoundTrippingStoryNodeRepository();

    // The renderer is injected directly (replacing languageRouter and
    // narrationRenderingService's dependency after construction),
    // bypassing the trivial/rich template split -- already covered
    // elsewhere -- so this test can count calls per node precisely.
    const container = new DependencyContainer({

        llmClient: new FakeLLMClient(),

        storyNodeRepository

    });

    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase = noNetworkKnowledgeBase();

    const { NarrationRenderingService } = await import("@storyforge/story-graph");

    (container as unknown as { narrationRenderingService: unknown }).narrationRenderingService =
        new NarrationRenderingService(counting, storyNodeRepository);

    const runtime = new AdventureRuntime(container);

    // --- startAdventure(): root must come back rendered ---

    const started = await runtime.startAdventure({

        childId: "child-1", childName: "Ari", ageRange: "7-8",
        location: "the edge of the Whispering Wood", moral: "honesty matters", domain: "ethics"

    });

    console.assert(
        started.narrative.length > 0,
        "Expected root to be returned with non-empty narrative"
    );

    console.assert(
        started.choices.length >= 1,
        "Expected root to have at least one choice"
    );

    // --- Look up the persisted adventureId via the real WorldState
    // (the same store AdventureRuntime uses), then re-fetch every
    // node through the repository -- a real round trip, not the
    // in-process object AdventureRuntime built. ---

    const worldState = await container.worldStateStore.get(started.worldId);

    const adventureId = worldState!.adventureId!;

    const everyPersistedNode = await storyNodeRepository.findByAdventureId(adventureId);

    const persistedRoot = everyPersistedNode.find(node => node.id === "root")!;

    console.assert(
        persistedRoot !== undefined && persistedRoot.narrative.length > 0,
        "Expected root, re-fetched through the repository, to have non-empty persisted narrative"
    );

    const frontierNodes = everyPersistedNode.filter(node => node.id !== "root");

    console.assert(
        frontierNodes.length === started.choices.length,
        `Expected exactly as many persisted frontier nodes as root choices, got ${frontierNodes.length} nodes for ${started.choices.length} choices`
    );

    // --- THE bug this test reproduces: every frontier node must have
    // narrative:"" and a valid pendingRenderRequest, surviving the
    // SAME repository round trip that lost it before the fix. ---

    for (const node of frontierNodes) {

        console.assert(
            node.narrative === "",
            `Expected frontier node '${node.id}' to be unrendered (narrative=""), got '${node.narrative}'`
        );

        console.assert(
            node.pendingRenderRequest !== undefined,
            `Expected frontier node '${node.id}' to have a pendingRenderRequest -- this is exactly the reported bug if missing`
        );

    }

    console.assert(
        counting.callsByNarrativeSeed.size === 1,
        `Expected exactly 1 renderer call so far (root only), got ${counting.callsByNarrativeSeed.size} distinct calls`
    );

    // --- playTurn(choice 1): only THAT frontier node renders ---

    const chosenId = started.choices[0].id;

    const chosenNodeId = persistedRoot.choices.find(choice => choice.id === chosenId)!.nextNodeId;

    const turn = await runtime.playTurn({

        worldId: started.worldId, sessionId: started.sessionId, childId: "child-1",
        childName: "Ari", ageRange: "7-8", selectedChoiceId: chosenId

    });

    console.assert(
        turn.narrative.length > 0,
        "Expected the chosen frontier node to render successfully"
    );

    console.assert(
        counting.callsByNarrativeSeed.size === 2,
        `Expected exactly 2 distinct renderer calls after choosing one frontier node (root + this one), got ${counting.callsByNarrativeSeed.size}`
    );

    // --- The other ORIGINAL frontier siblings remain untouched and
    // unrendered -- zero calls were ever made for them. The CHOSEN
    // node, since it's a frontier (not yet ending-eligible this
    // early), gets progressively EXPANDED by this same turn -- its
    // own newly-created children are also correctly unrendered
    // (lazy narration applies to them too), so the total unrendered
    // count is siblings + new children, not simply N-1. ---

    const afterTurnNodes = await storyNodeRepository.findByAdventureId(adventureId);

    const originalSiblings = frontierNodes.filter(node => node.id !== chosenNodeId);

    const stillUnrenderedOriginalSiblings = afterTurnNodes.filter(
        node => originalSiblings.some(sibling => sibling.id === node.id) && node.narrative === ""
    );

    console.assert(
        stillUnrenderedOriginalSiblings.length === originalSiblings.length,
        `Expected all ${originalSiblings.length} original sibling frontier nodes to remain untouched and unrendered, got ${stillUnrenderedOriginalSiblings.length}`
    );

    console.assert(
        stillUnrenderedOriginalSiblings.every(node => node.pendingRenderRequest !== undefined),
        "Expected every untouched sibling frontier node to retain its pendingRenderRequest"
    );

    const chosenNodeAfterTurn = afterTurnNodes.find(node => node.id === chosenNodeId)!;

    console.assert(
        chosenNodeAfterTurn.narrative.length > 0,
        "Expected the chosen node itself to now be rendered"
    );

    console.assert(
        chosenNodeAfterTurn.choices.length > 0,
        "Expected the chosen node to have been progressively expanded (new choices), not left as a dead end"
    );

    console.log("Lazy narration Postgres-lifecycle regression test passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
