import { ChapterState, ChapterPhase } from "@storyforge/simulation-engine";

// Section C: deterministic, centralized, no LLM, no prose, no direct
// graph mutation -- it only decides WHERE the chapter is, not WHAT
// happens next structurally (that stays AdventureRuntime +
// DeterministicExpansionService's job).
//
// Deliberately simple thresholds for this first pass (explicitly
// requested: "avoid fake sophistication"). Centralized here so the
// policy can be tuned later without touching AdventureRuntime.
const MEANINGFUL_EVENTS_FOR_CLIMAX = 3;

const MIN_TURN_FOR_CHALLENGE = 3;

const MIN_TURN_FOR_DEVELOPMENT = 2;

const MIN_TURN_TO_END = 4;

export class ChapterProgressionEngine {

    // Advances chapter state by one turn. `eventOccurred` reuses the
    // SAME signal AdventureRuntime already has (`!!nextNode.eventType`)
    // -- no new classification invented here.
    advance(
        current: ChapterState,
        eventOccurred: boolean
    ): ChapterState {

        const turn = current.turn + 1;

        const meaningfulEvents = current.meaningfulEvents + (eventOccurred ? 1 : 0);

        const climaxReached = current.climaxReached || meaningfulEvents >= MEANINGFUL_EVENTS_FOR_CLIMAX;

        const phase = this.phaseFor(turn, climaxReached, current.phase);

        return { turn, phase, meaningfulEvents, climaxReached };

    }

    private phaseFor(
        turn: number,
        climaxReached: boolean,
        previousPhase: ChapterPhase
    ): ChapterPhase {

        if (turn === 0) {
            return "opening";
        }

        if (previousPhase === "climax") {
            return "resolution";
        }

        if (previousPhase === "resolution") {
            return "resolution";
        }

        if (climaxReached) {
            return "climax";
        }

        if (turn >= MIN_TURN_FOR_CHALLENGE) {
            return "challenge";
        }

        if (turn >= MIN_TURN_FOR_DEVELOPMENT) {
            return "development";
        }

        return "exploration";

    }

    // canEnd = minimum meaningful interaction threshold satisfied AND
    // climaxReached AND phase === "resolution". This is the ONLY
    // place that decides ending eligibility -- AdventureRuntime and
    // DeterministicExpansionService only ever ask this question, they
    // never re-derive it.
    canEnd(
        state: ChapterState
    ): boolean {

        return state.climaxReached &&
               state.phase === "resolution" &&
               state.turn >= MIN_TURN_TO_END;

    }

}
