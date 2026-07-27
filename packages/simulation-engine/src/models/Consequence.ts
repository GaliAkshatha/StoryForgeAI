import { StateEffect } from "./StateEffect";
import { WorldState } from "./WorldState";
import { Choice } from "./Choice";
import { WorldUpdate } from "./WorldUpdate";

export interface Consequence {

    // LLM-authored narrative of what happened as a result of the
    // decision. Narration only -- never the source of new facts.
    narrative: string;

    emotionalTone: string;

    // Exactly 4 meaningful choices for what the child does next. Per
    // the Master Prompt, the child never sees a free-text box again
    // -- only these cards.
    choices: Choice[];

    // Short, free-form tags naming the value(s) this moment touches
    // (e.g. "honesty", "perseverance"). Never shown to the child and
    // never phrased as a lesson -- these exist so the backend/parent
    // dashboard can trace *why* a moment mattered, not to preach at
    // the child in-story.
    learningSignals: string[];

    // The effects that were actually applied (post-validation) by
    // the DeterministicSimulator. May be a subset of what the LLM
    // proposed, if some proposals were invalid.
    effects: StateEffect[];

    // Backend-facing summary of effects, derived from the above --
    // this is what the API returns to callers instead of the full
    // WorldState.
    worldUpdate: WorldUpdate;

    worldStateAfter: WorldState;

}
