export type ChapterPhase =
    | "opening"
    | "exploration"
    | "development"
    | "challenge"
    | "climax"
    | "resolution";

// Section B: the smallest state needed to separate "a frontier node
// was reached" from "the chapter should conclude." Deliberately does
// NOT include fields like tension/learningProgress that the current
// architecture has no trustworthy way to compute.
export interface ChapterState {

    turn: number;

    phase: ChapterPhase;

    // Count of turns that landed on an eventType-tagged node -- reuses
    // the SAME signal AdventureEvent logging already relies on
    // (`if (nextNode.eventType)` in AdventureRuntime), rather than
    // inventing a new definition of "meaningful."
    meaningfulEvents: number;

    climaxReached: boolean;

}

export function initialChapterState(): ChapterState {

    return {

        turn: 0,

        phase: "opening",

        meaningfulEvents: 0,

        climaxReached: false

    };

}
