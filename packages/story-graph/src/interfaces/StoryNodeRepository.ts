import { StoryNode } from "../models/StoryNode";

export interface StoryNodeRepository {

    findById(
        adventureId: string,
        nodeId: string
    ): Promise<StoryNode | undefined>;

    findByAdventureId(
        adventureId: string
    ): Promise<StoryNode[]>;

    // Bulk insert -- the initial blueprint generation writes many
    // nodes at once, and so will background expansion later.
    saveMany(
        nodes: StoryNode[]
    ): Promise<void>;

    // Rewrites a single existing node -- used by background
    // expansion to convert a near-exhaustion ending node into a
    // junction pointing at a freshly generated subtree.
    updateNode(
        node: StoryNode
    ): Promise<void>;

    count(
        adventureId: string
    ): Promise<number>;

}
