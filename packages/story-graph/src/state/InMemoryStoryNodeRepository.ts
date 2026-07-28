import { StoryNodeRepository } from "../interfaces/StoryNodeRepository";
import { StoryNode } from "../models/StoryNode";

export class InMemoryStoryNodeRepository implements StoryNodeRepository {

    private readonly nodes = new Map<string, StoryNode>();

    private key(adventureId: string, nodeId: string): string {

        return `${adventureId}:${nodeId}`;

    }

    async findById(
        adventureId: string,
        nodeId: string
    ): Promise<StoryNode | undefined> {

        return this.nodes.get(this.key(adventureId, nodeId));

    }

    async findByAdventureId(
        adventureId: string
    ): Promise<StoryNode[]> {

        return [...this.nodes.values()].filter(
            node => node.adventureId === adventureId
        );

    }

    async saveMany(
        nodes: StoryNode[]
    ): Promise<void> {

        for (const node of nodes) {
            this.nodes.set(this.key(node.adventureId, node.id), node);
        }

    }

    async updateNode(
        node: StoryNode
    ): Promise<void> {

        this.nodes.set(this.key(node.adventureId, node.id), node);

    }

    async count(
        adventureId: string
    ): Promise<number> {

        return [...this.nodes.values()].filter(
            node => node.adventureId === adventureId
        ).length;

    }

}
