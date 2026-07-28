// The fixed vocabulary of "Adventure Events" a StoryNode can be
// tagged with at GENERATION time (part of the same one-shot AI call
// that produces the node itself -- see story-graph's
// AdventureBlueprintGenerator). Because the tag is authored once,
// up front, deriving an event from a node during play is a pure
// lookup, not a new LLM call -- this is what lets the Reflection and
// Analytics Engines move from "every turn" to "chapter/adventure
// end" without losing the signal they need.
export type AdventureEventType =
    | "helped_npc"
    | "ignored_warning"
    | "solved_puzzle"
    | "asked_questions"
    | "shared_resources"
    | "led_team"
    | "failed_puzzle"
    | "retried"
    | "explored"
    | "observed";

export const ADVENTURE_EVENT_TYPES: AdventureEventType[] = [
    "helped_npc",
    "ignored_warning",
    "solved_puzzle",
    "asked_questions",
    "shared_resources",
    "led_team",
    "failed_puzzle",
    "retried",
    "explored",
    "observed"
];
