import { Adventure } from "../models/Adventure";
import { StoryNode } from "../models/StoryNode";

export interface SerializedGraph {

    adventure: Adventure;

    nodes: StoryNode[];

}

// Phase 4/12: turns a compiled adventure into a single portable JSON
// document -- what Story Genome-based caching/recommendations
// (future work) would store and compare, and what GraphLoader below
// reads back. Deliberately just structural (de)serialization, no
// storage concerns -- that's what the repositories are for.
export class GraphSerializer {

    serialize(
        adventure: Adventure,
        nodes: StoryNode[]
    ): string {

        const payload: SerializedGraph = { adventure, nodes };

        return JSON.stringify(payload);

    }

}
