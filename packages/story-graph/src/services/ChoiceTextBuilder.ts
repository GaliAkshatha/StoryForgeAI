import { AdventureEventType } from "@storyforge/shared";
import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";

// Phase 2B (Section C-H): replaces CHOICE_TEXT's eventType-only
// lookup with wording contextualized by structural fields already
// available at expansion time (target, location) -- deliberately
// template-based rather than an NLP transform, per the explicit "do
// not build a fragile general English NLP engine" instruction.
// Presentation-only: never re-checks feasibility, never leaks a
// consequence, never touches rendering.
//
// Audit note: choice text used to also splice NarrativeState's free-
// text `problem` field into these templates ("Try again -- {problem}").
// That was the source of a recurring class of bugs across several
// rounds of fixes -- dangling conjunctions, double conjunctions,
// missing articles ("fallen log blocks stream") -- because Gemini's
// output isn't guaranteed to be a grammatically complete phrase, and
// no amount of cleanup fully closes that gap. Choice text now uses
// ONLY reliable, structured fields (the target character's name,
// never raw problem text); the narration shown directly above the
// choices already establishes the situation, so choices don't need
// to restate it. Vague-but-always-correct beats specific-but-
// occasionally-broken for a children's product.
export class ChoiceTextBuilder {

    build(
        candidate: CandidateEvent,
        narrativeState: NarrativeState
    ): string {

        const target = candidate.targetName;

        const text = this.buildForType(candidate.type, target);

        return this.safe(text, candidate.type, target);

    }

    private buildForType(
        type: AdventureEventType,
        target: string | undefined
    ): string | undefined {

        switch (type) {

            case "helped_npc":
                return target ? `Help ${target}` : undefined;

            case "asked_questions":
                return target ? `Ask ${target} what happened` : undefined;

            case "shared_resources":
                return target ? `Share something with ${target}` : undefined;

            case "led_team":
                return target ? `Take the lead with ${target}` : `Take the lead`;

            case "solved_puzzle":
                return `Try to fix it`;

            case "failed_puzzle":
                return `Give it a try`;

            case "retried":
                return `Try again`;

            case "ignored_warning":
                return "Keep going despite the warning";

            case "explored":
                return `Look around nearby`;

            case "observed":
                return `Look closely`;

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
