import { StoryEdge } from "../models/StoryEdge";
import { StoryNodeRepository } from "./StoryNodeRepository";

export interface StoryEdgeRepository {

    findByAdventureId(
        adventureId: string
    ): Promise<StoryEdge[]>;

    findFromNode(
        adventureId: string,
        nodeId: string
    ): Promise<StoryEdge[]>;

}

// Derives edges from whatever StoryNodeRepository it's given --
// works identically whether that's the in-memory or Postgres
// implementation, since it never touches storage directly itself.
// packages/database's PostgresStoryEdgeRepository is literally this
// class, constructed with a PostgresStoryNodeRepository.
export class DerivedStoryEdgeRepository implements StoryEdgeRepository {

    constructor(
        private readonly nodes: StoryNodeRepository
    ) {}

    async findByAdventureId(
        adventureId: string
    ): Promise<StoryEdge[]> {

        const nodes = await this.nodes.findByAdventureId(adventureId);

        return nodes.flatMap(node => this.edgesFor(adventureId, node.id, node.choices));

    }

    async findFromNode(
        adventureId: string,
        nodeId: string
    ): Promise<StoryEdge[]> {

        const node = await this.nodes.findById(adventureId, nodeId);

        return node ? this.edgesFor(adventureId, node.id, node.choices) : [];

    }

    private edgesFor(
        adventureId: string,
        fromNodeId: string,
        choices: { id: string; text: string; nextNodeId: string; requiresFlags?: string[] }[]
    ): StoryEdge[] {

        return choices.map(choice => ({

            id: `${fromNodeId}:${choice.id}`,

            adventureId,

            fromNodeId,

            toNodeId: choice.nextNodeId,

            text: choice.text,

            requiresFlags: choice.requiresFlags

        }));

    }

}
