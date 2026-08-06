import { JsonParser } from "@storyforge/llm-client";

import { Adventure } from "../models/Adventure";
import { StoryNode } from "../models/StoryNode";
import { StoryChoice } from "../models/StoryChoice";
import { RelationshipStatus } from "@storyforge/simulation-engine";
import { AIServices } from "./AIServices";
import { GraphValidator } from "./GraphValidator";
import { ADVENTURE_BLUEPRINT_SCHEMA } from "./adventureBlueprintSchema";
import { ADVENTURE_EXPANSION_SCHEMA } from "./adventureExpansionSchema";

// See GeminiClient for why this is opt-in -- dumping every generated
// adventure's full text by default is noisy and can expose
// generated/user-derived content in logs.
const DEBUG_RAW_RESPONSE = process.env.LLM_DEBUG_RAW_RESPONSE === "true";

export interface GenerateBlueprintInput {

    childId: string;

    childName: string;

    ageRange: string;

    aboutChild?: string;

    location: string;

    moral: string;

    domain: string;

}

export interface GenerateBlueprintOptions {

    knowledgeContext?: string;

}

// The raw shape the LLM returns -- close to but not identical to the
// persisted Adventure/StoryNode models (id/adventureId/createdAt are
// assigned here, not by the model).
interface BlueprintLLMOutput {

    title: string;

    characters: Adventure["characters"];

    world: Adventure["world"];

    learningPlan: Adventure["learningPlan"];

    emotionCurve: Adventure["emotionCurve"];

    genome: Adventure["genome"];

    rootNodeId: string;

    nodes: RawBlueprintNode[];

}

// A node exactly as Gemini returns it -- `effectsJson` is a
// JSON-encoded string, not a nested array of objects (see
// adventureBlueprintSchema.ts for why: the nested array-of-objects
// shape repeatedly triggered a live "too many states for serving"
// 400 from Gemini's constrained decoding). parseEffects() below
// converts this into the real StoryNode shape.
type RawBlueprintNode = Omit<StoryNode, "adventureId" | "createdAt" | "effects"> & {

    effectsJson: string;

};

export interface GeneratedBlueprint {

    adventure: Adventure;

    nodes: StoryNode[];

}

export interface ExpandFromInput {

    adventureId: string;

    childName: string;

    ageRange: string;

    aboutChild?: string;

    moral: string;

    characters: Adventure["characters"];

    world: Adventure["world"];

    // The node being converted from an ending into a junction --
    // its narrative is what the new subtree continues from.
    hingeNarrative: string;

    // Part 6 (Memory Engine): established NPC trust/affinity so far,
    // so the continuation can have characters remember what happened
    // ("You helped me last time...") instead of resetting to
    // strangers every chapter.
    relationships: RelationshipStatus[];

    // Part 5 (Emotion Engine): a natural-language note derived from
    // recent emotional trend -- e.g. "ease off, frustration is
    // trending high." Never shown to the child.
    emotionalGuidance: string;

}

export interface ExpandedSubtree {

    // The 4 new choices the hinge node should be given, replacing
    // its ending status.
    entryChoices: StoryChoice[];

    nodes: StoryNode[];

}

interface ExpansionLLMOutput {

    entryChoices: StoryChoice[];

    nodes: RawBlueprintNode[];

}

// Part 1's "New Runtime": exactly ONE expensive AI generation per
// adventure (or per background expansion, later), producing a
// complete, self-contained chapter of the Story Graph. Everything
// after this is pure traversal -- see StoryNodeRepository /
// AdventureRepository and the (future) graph-traversal runtime.
// @deprecated Correction pass (LLM-owned-topology removal): both
// generate() and expandFrom() are superseded and no longer
// constructed into AdventureCompiler's pipeline. generate() asked
// Gemini to invent an entire node/edge topology in one call, which
// both (a) caused a live "too many states for serving" 400 from the
// resulting schema size, and (b) let Gemini generate a structurally
// invalid graph (an unreachable node) since free-form per-node
// generation has no mechanism to guarantee a global
// graph-connectivity invariant. Replaced by
// AdventureMetadataGenerator (creative content only, no topology)
// + InitialStoryBuilder (deterministic structure, zero LLM calls).
// expandFrom() was already superseded earlier by
// DeterministicExpansionService for ongoing chapter expansion. Kept
// -- not deleted -- since external callers weren't ruled out; see
// DependencyContainer for where this is still constructed but no
// longer wired into AdventureCompiler.
export class AdventureBlueprintGenerator {

    private readonly validator = new GraphValidator();

    constructor(
        private readonly ai: AIServices
    ) {}

    async generate(
        input: GenerateBlueprintInput,
        options?: GenerateBlueprintOptions
    ): Promise<GeneratedBlueprint> {

        const prompt = this.ai.promptManager.compile(
            "adventure-blueprint",
            {
                childName: input.childName,
                ageRange: input.ageRange,
                aboutChild: input.aboutChild?.trim() || "none provided",
                location: input.location,
                moral: input.moral,
                knowledgeContext: options?.knowledgeContext ?? "(none)"
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            responseSchema: ADVENTURE_BLUEPRINT_SCHEMA,

            metadata: { caller: "AdventureBlueprintGenerator", purpose: "generate_adventure_blueprint" }

        });

        if (DEBUG_RAW_RESPONSE) {

            console.log(
                "\n===== AdventureBlueprintGenerator: raw LLM response before JsonParser.parse() (LLM_DEBUG_RAW_RESPONSE=true) =====\n" +
                response.text +
                "\n===== end raw response =====\n"
            );

        }

        let output: BlueprintLLMOutput;

        try {

            output = JsonParser.parse<BlueprintLLMOutput>(response.text);

        }
        catch (error) {

            console.error(
                "\n===== AdventureBlueprintGenerator: JsonParser.parse() failed =====\n" +
                (error instanceof Error ? error.message : String(error))
            );

            throw new Error(
                `AdventureBlueprintGenerator: Invalid JSON response.\n${error}`
            );

        }

        this.validateShape(output);

        const adventureId = crypto.randomUUID();

        const createdAt = new Date().toISOString();

        const nodes: StoryNode[] = output.nodes.map(node => {

            const { effectsJson, ...rest } = node;

            return {

                ...rest,

                effects: this.parseEffectsJson(effectsJson, node.id),

                adventureId,

                createdAt

            };

        });

        const structural = this.validator.validate(nodes, output.rootNodeId);

        if (!structural.valid) {

            throw new Error(
                `AdventureBlueprintGenerator: generated graph failed structural validation:\n` +
                structural.errors.map(error => `  - ${error}`).join("\n")
            );

        }

        const adventure: Adventure = {

            id: adventureId,

            childId: input.childId,

            // Deprecated path -- premise didn't exist in the old
            // blueprint schema and this method is never called by
            // AdventureCompiler anymore. Empty string keeps the type
            // satisfied without inventing meaning for dead code.
            premise: "",

            initialProblem: "",

            plotOutline: [],

            title: output.title,

            moral: input.moral,

            domain: input.domain,

            characters: output.characters,

            world: output.world,

            learningPlan: output.learningPlan,

            emotionCurve: output.emotionCurve,

            genome: output.genome,

            rootNodeId: output.rootNodeId,

            createdAt

        };

        return { adventure, nodes };

    }

    // effectsJson is a JSON-encoded string (see
    // adventureBlueprintSchema.ts / RawBlueprintNode for why the
    // schema no longer represents effects as a nested array). Malformed
    // JSON from the model degrades to an empty effects array rather
    // than failing the entire blueprint -- a node with no effects is
    // a minor content gap, not a reason to discard an otherwise-valid
    // generation.
    private parseEffectsJson(
        effectsJson: string,
        nodeId: string
    ): StoryNode["effects"] {

        if (!effectsJson) {
            return [];
        }

        try {

            const parsed = JSON.parse(effectsJson);

            return Array.isArray(parsed) ? parsed : [];

        }
        catch (error) {

            console.error(
                `\n===== AdventureBlueprintGenerator: malformed effectsJson on node '${nodeId}' -- defaulting to no effects =====\n` +
                `raw: ${effectsJson.slice(0, 200)}\n` +
                `error: ${error instanceof Error ? error.message : String(error)}\n`
            );

            return [];

        }

    }

    private validateShape(
        output: BlueprintLLMOutput
    ): void {

        if (!output.title) {
            throw new Error("Blueprint output missing title.");
        }

        if (!output.rootNodeId) {
            throw new Error("Blueprint output missing rootNodeId.");
        }

        if (!Array.isArray(output.nodes) || output.nodes.length === 0) {
            throw new Error("Blueprint output missing nodes.");
        }

        if (!Array.isArray(output.characters)) {
            throw new Error("Blueprint output missing characters.");
        }

        if (!output.world?.setting) {
            throw new Error("Blueprint output missing world.");
        }

        if (!Array.isArray(output.learningPlan)) {
            throw new Error("Blueprint output missing learningPlan.");
        }

        if (!output.genome?.theme) {
            throw new Error("Blueprint output missing genome.");
        }

        for (const node of output.nodes) {

            if (!node.id || !node.narrative) {

                throw new Error(
                    "Blueprint output has a node missing id or narrative."
                );

            }

            if (!node.isEnding && node.choices.length !== 4) {

                throw new Error(
                    `Blueprint output node '${node.id}' is not an ending but has ${node.choices.length} choices (expected 4).`
                );

            }

        }

    }

    // Generates the next chapter's subtree when the graph is nearly
    // exhausted (Part 1's "Background Expansion" flow). Called by
    // the graph-traversal runtime, not by the child's request path
    // directly -- see AdventureRuntime for the threshold check that
    // decides when to call this.
    async expandFrom(
        input: ExpandFromInput,
        options?: GenerateBlueprintOptions
    ): Promise<ExpandedSubtree> {

        // Short, unique-per-call prefix so new node/choice ids can
        // never collide with ids from earlier chapters, without
        // needing to know the full existing id set up front.
        const nodeIdPrefix = `ch-${crypto.randomUUID().slice(0, 8)}`;

        const prompt = this.ai.promptManager.compile(
            "adventure-expansion",
            {
                childName: input.childName,
                ageRange: input.ageRange,
                aboutChild: input.aboutChild?.trim() || "none provided",
                moral: input.moral,
                characters: JSON.stringify(input.characters, null, 2),
                world: JSON.stringify(input.world, null, 2),
                relationships: input.relationships.length > 0
                    ? JSON.stringify(input.relationships, null, 2)
                    : "(no established relationships yet)",
                emotionalGuidance: input.emotionalGuidance,
                hingeNarrative: input.hingeNarrative,
                nodeIdPrefix,
                knowledgeContext: options?.knowledgeContext ?? "(none)"
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            responseSchema: ADVENTURE_EXPANSION_SCHEMA,

            metadata: { caller: "AdventureBlueprintGenerator", purpose: "expand_story_graph" }

        });

        if (DEBUG_RAW_RESPONSE) {

            console.log(
                "\n===== AdventureBlueprintGenerator.expandFrom: raw LLM response before JsonParser.parse() (LLM_DEBUG_RAW_RESPONSE=true) =====\n" +
                response.text +
                "\n===== end raw response =====\n"
            );

        }

        let output: ExpansionLLMOutput;

        try {

            output = JsonParser.parse<ExpansionLLMOutput>(response.text);

        }
        catch (error) {

            console.error(
                "\n===== AdventureBlueprintGenerator.expandFrom: JsonParser.parse() failed =====\n" +
                (error instanceof Error ? error.message : String(error))
            );

            throw new Error(
                `AdventureBlueprintGenerator.expandFrom: Invalid JSON response.\n${error}`
            );

        }

        if (!Array.isArray(output.entryChoices) || output.entryChoices.length !== 4) {

            throw new Error(
                `Expansion output must contain exactly 4 entryChoices, got ${output.entryChoices?.length ?? 0}.`
            );

        }

        if (!Array.isArray(output.nodes) || output.nodes.length === 0) {

            throw new Error("Expansion output missing nodes.");

        }

        const createdAt = new Date().toISOString();

        const newNodes: StoryNode[] = output.nodes.map(node => {

            const { effectsJson, ...rest } = node;

            return {

                ...rest,

                effects: this.parseEffectsJson(effectsJson, node.id),

                adventureId: input.adventureId,

                createdAt

            };

        });

        // Validate the NEW subtree as a self-contained graph, using
        // one of the entryChoices' targets as a synthetic root --
        // this catches dangling edges / unreachable nodes within the
        // new subtree before it's grafted onto the hinge node.
        const syntheticRoot = output.entryChoices[0].nextNodeId;

        const structural = this.validator.validate(newNodes, syntheticRoot);

        // Only fail on dangling-edge / duplicate-id errors -- a node
        // reachable only via one of the OTHER 3 entryChoices (not
        // syntheticRoot) will look "unreachable" from a single-choice
        // root check, so filter that specific false positive out.
        const realErrors = structural.errors.filter(
            error => !error.includes("unreachable from the root node")
        );

        if (realErrors.length > 0) {

            throw new Error(
                `AdventureBlueprintGenerator.expandFrom: generated subtree failed structural validation:\n` +
                realErrors.map(error => `  - ${error}`).join("\n")
            );

        }

        for (const choice of output.entryChoices) {

            const targetExists = newNodes.some(node => node.id === choice.nextNodeId);

            if (!targetExists) {

                throw new Error(
                    `AdventureBlueprintGenerator.expandFrom: entryChoice '${choice.id}' points to unknown node '${choice.nextNodeId}'.`
                );

            }

        }

        return {

            entryChoices: output.entryChoices,

            nodes: newNodes

        };

    }

}
