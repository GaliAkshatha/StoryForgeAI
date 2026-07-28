// An explicit "edge" view of the graph. Physically, edges are
// already stored as StoryChoice entries inside StoryNode.choices
// (id, text, nextNodeId IS an edge) -- StoryEdge and
// StoryEdgeRepository below are a normalized read-side projection
// over that same data, not a second copy of it, so there is no
// migration and no dual-write risk. Kept separate because "list all
// edges out of this node" or "list the whole graph's edges" is a
// genuinely different query shape than "get this node," and giving
// it its own type makes that intent explicit at call sites (e.g.
// GraphLoader, future graph-visualization tooling).
export interface StoryEdge {

    id: string;

    adventureId: string;

    fromNodeId: string;

    toNodeId: string;

    text: string;

    requiresFlags?: string[];

}
