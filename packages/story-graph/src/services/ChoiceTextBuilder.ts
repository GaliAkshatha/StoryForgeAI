import { AdventureEventType } from "@storyforge/shared";
import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";

// Choice-variety pass: the ACTUAL fix for choices feeling "lame and
// repetitive" (a real user reported this directly). The prior design
// was one fixed hardcoded phrase per event type, reused byte-for-byte
// across every single adventure ever played -- "Take the lead with
// X" every time, regardless of theme or tone. Two layers now:
//
//   1. Per-adventure templates (NarrativeState.choiceTemplates),
//      generated ONCE by Gemini alongside the rest of the adventure's
//      metadata, tailored to THIS adventure's theme -- zero added
//      runtime cost, since it rides the one call that already
//      happens at adventure start. Validated per-field at generation
//      time (AdventureMetadataGenerator), so what arrives here is
//      already known-safe: right length, correct placeholder
//      presence, never a leaked outcome.
//   2. A small ROTATING fallback set (2-3 phrasings per type,
//      deterministic, not random) for when a template is missing --
//      cheap, always-safe, and at least varies turn to turn instead
//      of being one fixed string forever.
//
// Same discipline as before: still deliberately template-based, never
// an NLP transform of free text, never re-checks feasibility, never
// leaks a consequence.
export class ChoiceTextBuilder {

    build(
        candidate: CandidateEvent,
        narrativeState: NarrativeState
    ): string {

        const target = candidate.targetName;

        const adventureTemplate = narrativeState.choiceTemplates?.[candidate.type];

        const text = adventureTemplate
            ? this.fillTemplate(adventureTemplate, target)
            : this.buildForType(candidate.type, target, narrativeState);

        return this.safe(text, candidate.type, target);

    }

    // Templates use the literal placeholder "{target}" -- validated
    // to be present/absent correctly at generation time, so this is
    // a plain substring replace, not a parser.
    private fillTemplate(
        template: string,
        target: string | undefined
    ): string | undefined {

        if (template.includes("{target}")) {

            if (!target) {
                return undefined;
            }

            return template.replace("{target}", target);

        }

        return template;

    }

    // Deterministic rotation -- picks based on how many events have
    // happened so far, not Math.random(), so replaying the same
    // adventure state always gets the same choice text (same
    // reproducibility property as the rest of this engine).
    private rotate(
        variants: string[],
        narrativeState: NarrativeState
    ): string {

        const index = narrativeState.recentEventTypes.length % variants.length;

        return variants[index];

    }

    private buildForType(
        type: AdventureEventType,
        target: string | undefined,
        narrativeState: NarrativeState
    ): string | undefined {

        switch (type) {

            case "helped_npc":
                return target
                    ? this.rotate([`Help ${target}`, `Lend ${target} a hand`, `Step in to help ${target}`], narrativeState)
                    : undefined;

            case "asked_questions":
                return target
                    ? this.rotate([`Ask ${target} what happened`, `Ask ${target} about it`], narrativeState)
                    : undefined;

            case "shared_resources":
                return target
                    ? this.rotate([`Offer ${target} what you found`, `Give ${target} a hand with supplies`], narrativeState)
                    : undefined;

            case "led_team":
                return target
                    ? this.rotate([`Take the lead with ${target}`, `Guide ${target} forward`], narrativeState)
                    : `Take the lead`;

            case "solved_puzzle":
                return this.rotate(["Try to fix it", "Try to work it out"], narrativeState);

            case "failed_puzzle":
                return this.rotate(["Give it a try", "Take a shot at it"], narrativeState);

            case "retried":
                return this.rotate(["Try again", "Give it another go"], narrativeState);

            case "ignored_warning":
                return this.rotate(["Keep going despite the warning", "Press on anyway"], narrativeState);

            case "explored":
                return this.rotate(["Look around nearby", "Explore a little further"], narrativeState);

            case "observed":
                return this.rotate(["Look closely", "Take a closer look"], narrativeState);

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

    shared_resources: target => `Offer ${target ?? "them"} what you found`,

    led_team: () => "Take the lead",

    failed_puzzle: () => "Attempt the challenge",

    retried: () => "Try again",

    explored: () => "Explore further",

    observed: () => "Look closely around"

};
