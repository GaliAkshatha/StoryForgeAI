// An edge in the Story Graph. `nextNodeId` is the graph edge target
// -- this is what makes gameplay a pure traversal (Part 1's "no AI
// request" loop) instead of a fresh generation every turn.
export interface StoryChoice {

    id: string;

    text: string;

    nextNodeId: string;

    // Optional gating: this choice is only offered if every flag
    // named here is currently true in the child's WorldState. Kept
    // deliberately simple (flag names only, not a full expression
    // language) since WorldState.flags is already the mechanism the
    // rest of the platform uses for "facts established during play."
    requiresFlags?: string[];

}
