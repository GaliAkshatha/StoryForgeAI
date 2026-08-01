import { AdventureEventType } from "@storyforge/shared";
import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";

// Phase 2B (Section C-H): replaces CHOICE_TEXT's eventType-only
// lookup with wording contextualized by the SAME structural fields
// already available at expansion time (target, current problem,
// location) -- deliberately template-based rather than an NLP
// transform of SemanticEvent.action's free text, per the explicit
// "do not build a fragile general English NLP engine" instruction.
// Presentation-only: never re-checks feasibility (that already
// happened in ConstraintEngine/EventScorer before this runs), never
// leaks a consequence, never touches rendering.
export class ChoiceTextBuilder {

    build(
        candidate: CandidateEvent,
        narrativeState: NarrativeState
    ): string {

        const target = candidate.targetName;

        // Section E.3 (short): NarrativeState.currentProblem is often
        // seeded from the adventure's full premise sentence (Phase
        // 2A), which can be much longer than a choice label should
        // be. Truncated to a short phrase HERE, before interpolation
        // -- so a verbose premise degrades to a shorter phrase
        // gracefully instead of silently tripping the length safety
        // net in safe() and collapsing every choice to the generic
        // fallback for the whole first stretch of an adventure.
        const problem = this.shorten(narrativeState.currentProblem);

        const location = candidate.locationId ?? narrativeState.location;

        const text = this.buildForType(candidate.type, target, problem, location);

        return this.safe(text, candidate.type, target);

    }

    // Keeps roughly the first clause of a longer sentence -- cheap,
    // deterministic, no NLP. "a fallen branch blocks the path and
    // Squeak needs help moving it" -> "a fallen branch blocks the path".
    private shorten(
        text: string | undefined
    ): string | undefined {

        if (!text) {
            return undefined;
        }

        const words = text.trim().split(/\s+/);

        if (words.length <= 6) {
            return text.trim();
        }

        return words.slice(0, 6).join(" ");

    }

    private buildForType(
        type: AdventureEventType,
        target: string | undefined,
        problem: string | undefined,
        location: string
    ): string | undefined {

        switch (type) {

            case "helped_npc":
                return target && problem
                    ? `Help ${target} with ${problem}`
                    : target ? `Help ${target}` : undefined;

            case "asked_questions":
                return target && problem
                    ? `Ask ${target} about ${problem}`
                    : target ? `Ask ${target} about it` : undefined;

            case "shared_resources":
                return target ? `Share something with ${target}` : undefined;

            case "led_team":
                return problem
                    ? `Lead the way through ${problem}`
                    : target ? `Take the lead with ${target}` : undefined;

            case "solved_puzzle":
                return problem ? `Try to get past ${problem}` : undefined;

            case "failed_puzzle":
                return problem ? `Try to deal with ${problem}` : undefined;

            case "retried":
                return problem ? `Try ${problem} again` : undefined;

            case "ignored_warning":
                return "Keep going despite the warning";

            case "explored":
                return `Explore ${location} further`;

            case "observed":
                return problem
                    ? `Look closely at ${problem}`
                    : `Look closely around ${location}`;

            default:
                return undefined;

        }

    }

    // Section H: safe fallback hierarchy. Never returns undefined,
    // null, "[object Object]", or an empty string -- the last resort
    // is the same generic wording the old CHOICE_TEXT map used.
    private safe(
        text: string | undefined,
        type: AdventureEventType,
        target: string | undefined
    ): string {

        if (text && text.trim().length > 0 && text.trim().length <= 60) {

            return text.trim();

        }

        return GENERIC_FALLBACK[type](target);

    }

}

// Last-resort generic wording -- the SAME text the old CHOICE_TEXT
// map used, kept as the bottom of the fallback hierarchy rather than
// deleted (Section H explicitly allows this).
const GENERIC_FALLBACK: Record<AdventureEventType, (target: string | undefined) => string> = {

    helped_npc: target => `Help ${target ?? "them"}`,

    ignored_warning: () => "Keep going, ignore the warning",

    solved_puzzle: () => "Try to solve it",

    asked_questions: target => `Ask ${target ?? "them"} about it`,

    shared_resources: target => `Share something with ${target ?? "them"}`,

    led_team: () => "Take the lead",

    failed_puzzle: () => "Attempt the challenge",

    retried: () => "Try again",

    explored: () => "Explore further",

    observed: () => "Look closely around"

};
