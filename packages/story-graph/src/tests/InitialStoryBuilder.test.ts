import { InitialStoryBuilder } from "../services/InitialStoryBuilder";
import { DeterministicExpansionService } from "../services/DeterministicExpansionService";
import { CandidateEventGenerator } from "../services/CandidateEventGenerator";
import { ConstraintEngine } from "../services/ConstraintEngine";
import { EventScorer } from "../services/EventScorer";
import { MemoryRetrievalService } from "../services/MemoryRetrievalService";
import { SemanticEventBuilder } from "../services/SemanticEventBuilder";
import { GraphValidator } from "../services/GraphValidator";
import { createInitialWorldState } from "@storyforge/simulation-engine";

function makeBuilder(): InitialStoryBuilder {

    return new InitialStoryBuilder(

        new DeterministicExpansionService(

            new CandidateEventGenerator(),

            new ConstraintEngine(),

            new EventScorer(),

            new MemoryRetrievalService(),

            new SemanticEventBuilder()

        )

    );

}

function baseInput(adventureId: string) {

    const worldState = createInitialWorldState({
        worldId: `scaffold-${adventureId}`, childId: "child-1",
        location: "the Whispering Wood", moral: "honesty", domain: "ethics"
    });

    return {

        adventureId,

        worldState,

        characters: [
            { id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." },
            { id: "owl", name: "Orla", role: "mentor", description: "A wise owl." }
        ],

        actorName: "Ari",

        ageRange: "7-8",

        domain: "ethics",

        skillFocus: ["leadership"],

        location: "the Whispering Wood",

        premise: "a fox named Fenn waits quietly at the treeline"

    };

}

async function main(): Promise<void> {

    const validator = new GraphValidator();

    // =========================================================
    // A. Structural validity across MANY seeds -- InitialStoryBuilder
    // -> GraphValidator must ALWAYS succeed. adventureId feeds the
    // scoring seed (SeededRandom.seedFromString), so many distinct
    // adventureIds exercise many distinct seeds.
    // =========================================================

    const seedCount = 50;

    for (let i = 0; i < seedCount; i++) {

        const builder = makeBuilder();

        const adventureId = `adventure-seed-${i}`;

        const { rootNode, nodes } = await builder.build(baseInput(adventureId));

        const allNodes = [rootNode, ...nodes];

        const result = validator.validate(allNodes, rootNode.id);

        console.assert(
            result.valid,
            `Expected GraphValidator to pass for seed ${i}, got errors: ${result.errors.join(", ")}`
        );

        // Section G/K.6: dynamic choice count -- normal range is 2-3,
        // never padded with fabricated/rejected candidates. This
        // fixture's two-character setup always leaves >=3 valid
        // candidates, so the count should consistently land at the
        // NORMAL_MAX (3), not the old fixed 4.
        console.assert(
            rootNode.choices.length >= 2 && rootNode.choices.length <= 3,
            `Expected 2-3 choices for seed ${i} (ChoiceCountPolicy's normal range), got ${rootNode.choices.length}`
        );

        console.assert(
            nodes.length === rootNode.choices.length,
            `Expected exactly one frontier node per choice for seed ${i}, no padding, got ${nodes.length} nodes for ${rootNode.choices.length} choices`
        );

        // Section H: diversity -- no two selected candidates share an
        // eventType, when enough distinct types were available (10
        // templates exist, only 2-3 are ever selected, so this should
        // always hold for this fixture).
        const selectedTypes = nodes.map(node => node.eventType);

        console.assert(
            new Set(selectedTypes).size === selectedTypes.length,
            `Expected no duplicate eventTypes among selected choices for seed ${i}, got ${JSON.stringify(selectedTypes)}`
        );

    }

    // =========================================================
    // B. Determinism -- same metadata/world state/seed -> same
    // structural graph.
    // =========================================================

    {

        const input = baseInput("adventure-determinism");

        const resultA = await makeBuilder().build(input);

        const resultB = await makeBuilder().build(input);

        const strip = (r: typeof resultA) => ({

            rootChoices: r.rootNode.choices,

            nodes: r.nodes.map(node => {

                const { createdAt, ...rest } = node;

                void createdAt;

                return rest;

            })

        });

        console.assert(
            JSON.stringify(strip(resultA)) === JSON.stringify(strip(resultB)),
            "Expected identical metadata/world-state/adventureId to produce an identical structural graph (timestamps excluded)"
        );

    }

    // =========================================================
    // C. Zero LLM calls -- proven structurally: InitialStoryBuilder's
    // only dependency is DeterministicExpansionService, which (since
    // the correction pass) has no TextRenderer/LLMClient in its own
    // constructor either. Confirmed positively too: every node this
    // returns is unrendered structure (pendingRenderRequest set,
    // narrative empty) -- nothing here ever called a renderer.
    // =========================================================

    {

        console.assert(
            InitialStoryBuilder.length === 1,
            `Expected InitialStoryBuilder's constructor to take exactly one dependency (no renderer), got ${InitialStoryBuilder.length}`
        );

        console.assert(
            DeterministicExpansionService.length === 5,
            `Expected DeterministicExpansionService's constructor to have no TextRenderer among its 5 dependencies, got ${DeterministicExpansionService.length} params`
        );

        const { rootNode, nodes } = await makeBuilder().build(baseInput("adventure-zero-llm"));

        console.assert(
            rootNode.narrative === "" && rootNode.pendingRenderRequest !== undefined,
            "Expected the root node to be unrendered structure only (no LLM call happened to produce prose)"
        );

        console.assert(
            nodes.every(node => node.narrative === "" && node.pendingRenderRequest !== undefined),
            "Expected every frontier node to be unrendered structure only"
        );

    }

    // =========================================================
    // F. Explicit graph invariants
    // =========================================================

    {

        const { rootNode, nodes } = await makeBuilder().build(baseInput("adventure-invariants"));

        const allNodes = [rootNode, ...nodes];

        const result = validator.validate(allNodes, rootNode.id);

        console.assert(result.valid, `Expected a valid graph, got: ${result.errors.join(", ")}`);

        console.assert(
            rootNode.choices.every(choice => allNodes.some(node => node.id === choice.nextNodeId)),
            "Expected every root choice to point at a node that actually exists"
        );

        const ids = allNodes.map(node => node.id);

        console.assert(
            new Set(ids).size === ids.length,
            "Expected no duplicate node ids"
        );

        console.assert(
            nodes.every(node => !node.isEnding && node.choices.length === 0),
            "Expected every root-level frontier node to be a valid EXPANDABLE frontier (isEnding=false, zero choices) -- not a premature ending"
        );

        console.assert(
            !rootNode.isEnding && rootNode.choices.length > 0,
            "Expected root to be non-ending with at least one choice"
        );

        console.assert(
            allNodes.some(node => node.id === rootNode.id),
            "Expected rootNode.id to match a node in the persisted set"
        );

    }

    console.log("InitialStoryBuilder tests passed.");

}

main();
