import { AdventureRepository } from "../interfaces/AdventureRepository";
import { StoryNodeRepository } from "../interfaces/StoryNodeRepository";
import { GraphValidator } from "./GraphValidator";
import { SerializedGraph } from "./GraphSerializer";
import { CompiledAdventure } from "./AdventureCompiler";

export class InvalidSerializedGraphError extends Error {}

// The inverse of GraphSerializer -- re-validates structural integrity
// (same GraphValidator every freshly-generated graph already passes
// through) before persisting, since a loaded graph could come from
// an untrusted source (a cache, an export file) rather than a fresh
// AI generation.
export class GraphLoader {

    private readonly validator = new GraphValidator();

    constructor(
        private readonly adventures: AdventureRepository,
        private readonly nodes: StoryNodeRepository
    ) {}

    deserialize(
        json: string
    ): SerializedGraph {

        const parsed = JSON.parse(json) as Partial<SerializedGraph>;

        if (!parsed.adventure || !Array.isArray(parsed.nodes)) {

            throw new InvalidSerializedGraphError(
                "Serialized graph is missing 'adventure' or 'nodes'."
            );

        }

        return parsed as SerializedGraph;

    }

    async load(
        json: string
    ): Promise<CompiledAdventure> {

        const { adventure, nodes } = this.deserialize(json);

        const structural = this.validator.validate(nodes, adventure.rootNodeId);

        if (!structural.valid) {

            throw new InvalidSerializedGraphError(
                `Serialized graph failed structural validation:\n` +
                structural.errors.map(error => `  - ${error}`).join("\n")
            );

        }

        await this.adventures.save(adventure);

        await this.nodes.saveMany(nodes);

        const rootNode = nodes.find(node => node.id === adventure.rootNodeId)!;

        // Phase 2A: serialized graphs predate NarrativeState -- a
        // conservative default derived from what's actually
        // available here (no fabricated precision), matching the
        // same "first character becomes active, premise becomes the
        // problem" derivation InitialStoryBuilder uses for brand new
        // adventures.
        return {

            adventure,

            rootNode,

            narrativeState: {

                location: adventure.world?.setting ?? "the story",

                activeCharacterIds: adventure.characters[0] ? [adventure.characters[0].id] : [],

                currentGoal: "continue the adventure",

                currentProblem: adventure.premise,

                establishedFacts: adventure.premise ? [adventure.premise] : [],

                unresolvedThreads: [],

                recentEventTypes: []

            }

        };

    }

}
