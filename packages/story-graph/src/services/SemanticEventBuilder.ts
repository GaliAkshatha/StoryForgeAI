import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";
import { SemanticEvent } from "../models/SemanticEvent";
import { safeDashFragment, shortenSafely, stripTrailingPunctuation } from "./TextFragmentUtils";

export interface SemanticEventBuildInput {

    candidate: CandidateEvent;

    actorName: string;

    ageRange: string;

    aboutChild?: string;

    narrativeState: NarrativeState;

}

interface ContextualContent {

    action: string;

    consequence: string;

    factEstablished?: string;

    threadIntroduced?: string;

    threadResolved?: string;

    problemEstablished?: string;

    problemResolved?: boolean;

}

// Phase 2A: the ONLY thing allowed to construct a SemanticEvent. Pure
// mapping, no LLM, no randomness -- given the same selected candidate
// AND the same NarrativeState, always produces the same contextual
// event. General deterministic rules per eventType, not hardcoded to
// any one adventure's characters/locations/objects -- every piece of
// concrete content (target name, problem, location) is read from
// input, never invented here.
//
// Audit note: this used to duplicate its own copies of
// shorten/lowerFirst, which diverged from ChoiceTextBuilder's across
// several rounds of independent fixes. Both now share
// TextFragmentUtils.safeDashFragment, which never returns a fragment
// ending on a dangling conjunction/stopword or trailing punctuation
// -- and every template below has an explicit fallback for when the
// cleaned problem comes back undefined, instead of a non-null
// assertion that would produce "helps Squeak — undefined".
export class SemanticEventBuilder {

    build(
        input: SemanticEventBuildInput
    ): SemanticEvent {

        const { candidate, narrativeState } = input;

        const content = this.buildContent(candidate, narrativeState, input.actorName);

        return {

            task: "NARRATE",

            audience: { ageRange: input.ageRange },

            style: { tone: "fantasy_adventure", maxSentences: 3 },

            scene: { location: candidate.locationId ?? narrativeState.location },

            actor: { name: input.actorName },

            target: candidate.targetName ? { name: candidate.targetName } : undefined,

            event: { type: candidate.type, narrativeSeed: content.action },

            action: content.action,

            consequence: content.consequence,

            factEstablished: content.factEstablished,

            threadIntroduced: content.threadIntroduced,

            threadResolved: content.threadResolved,

            problemEstablished: content.problemEstablished,

            problemResolved: content.problemResolved,

            learning: candidate.learningTags[0] ? { skill: candidate.learningTags[0] } : undefined,

            personalizationHint: input.aboutChild

        };

    }

    // Reverted: alternating with "the {role}" produced unnatural,
    // game-label-sounding text ("the Energetic Squirrel") because
    // AdventureMetadataGenerator's role field isn't guaranteed to be
    // a simple, kid-friendly common noun. Always use the real name.
    private referenceFor(
        name: string | undefined
    ): string | undefined {

        return name;

    }

    private buildContent(
        candidate: CandidateEvent,
        state: NarrativeState,
        actorName: string
    ): ContextualContent {

        const target = this.referenceFor(candidate.targetName);

        const rawProblem = state.activeProblem?.status === "active"
            ? state.activeProblem.reason
            : state.currentProblem;

        // Cleaned ONCE, here, using the same safe utility
        // ChoiceTextBuilder uses -- never a raw or naively-truncated
        // fragment. May legitimately be undefined (e.g. nothing
        // usable survived cleaning); every case below has an
        // explicit fallback for that, never a non-null assertion.
        const problem = safeDashFragment(rawProblem);

        switch (candidate.type) {

            case "helped_npc":

                // ConstraintEngine already required problem_established
                // and npc_present -- a target is always present here.
                return problem ? {

                    action: `helps ${target} — ${problem}`,

                    consequence: `${target} is relieved -- ${actorName}'s help makes a real difference`,

                    factEstablished: `${actorName} helped ${target} with ${problem}`

                } : {

                    action: `helps ${target}`,

                    consequence: `${target} is relieved -- ${actorName}'s help makes a real difference`,

                    factEstablished: `${actorName} helped ${target}`

                };

            case "led_team":

                return {

                    action: `takes charge and leads ${target} — ${problem ?? "through a tricky moment"}`,

                    consequence: `${target} follows ${actorName}'s lead with new confidence`,

                    factEstablished: `${actorName} led ${target} through ${problem ?? "a difficult moment"}`

                };

            case "shared_resources":

                return {

                    action: `shares something useful with ${target}`,

                    consequence: `${target} is grateful and trusts ${actorName} a little more`,

                    factEstablished: `${actorName} shared something with ${target}`

                };

            case "asked_questions": {

                // If no problem is established yet, asking questions
                // is exactly how one gets established -- otherwise it
                // deepens the existing one.
                const establishesProblem = !problem;

                const topic = problem ?? `what's troubling ${target}`;

                return {

                    action: `asks ${target} — ${topic}`,

                    consequence: establishesProblem
                        ? `${target} explains what's wrong`
                        : `${target} shares a new detail about it`,

                    factEstablished: `${target} told ${actorName} about ${topic}`,

                    problemEstablished: establishesProblem ? topic : undefined

                };

            }

            case "solved_puzzle":

                return problem ? {

                    action: `figures out a way forward — ${problem}`,

                    consequence: `things start to get better -- ${problem} is no longer in the way`,

                    factEstablished: `${actorName} solved it: ${problem}`,

                    problemResolved: true

                } : {

                    action: `figures out a way forward`,

                    consequence: `things start to get better`,

                    factEstablished: `${actorName} solved the problem`,

                    problemResolved: true

                };

            case "failed_puzzle":

                // Audit fix: this used to unconditionally append
                // "-- but it doesn't quite work" onto problem!,
                // producing "...spilled and -- but it doesn't quite
                // work" when problem was a truncated fragment. Now
                // has an explicit no-problem fallback, and the
                // problem case builds one complete sentence rather
                // than assuming the fragment slots in cleanly.
                return problem ? {

                    action: `tries to help with ${problem}, but it doesn't quite work`,

                    consequence: `the problem remains, but now there's something to try again`,

                    threadIntroduced: `an unfinished attempt at ${problem}`

                } : {

                    action: `gives it a try, but it doesn't quite work`,

                    consequence: `the problem remains, but now there's something to try again`,

                    threadIntroduced: `an unfinished attempt`

                };

            case "retried": {

                const priorAttemptRaw = state.unresolvedThreads
                    .find(t => t.startsWith("an unfinished attempt"))
                    ?.replace("an unfinished attempt at ", "")
                    .replace("an unfinished attempt", "");

                // Audit fix: this used to append "and tries a
                // different way" directly onto unclean thread text,
                // which could itself end in a dangling connector,
                // producing "...spilled and and tries...". Re-cleaned
                // through the same safe utility before reuse.
                const priorAttempt = priorAttemptRaw ? stripTrailingPunctuation(shortenSafely(priorAttemptRaw) ?? "") : "";

                return {

                    action: priorAttempt.length > 0
                        ? `remembers what went wrong and tries a different way with ${priorAttempt}`
                        : `takes a breath and tries again`,

                    consequence: "this time it goes differently",

                    threadResolved: state.unresolvedThreads.find(t => t.startsWith("an unfinished attempt"))

                };

            }

            case "ignored_warning":

                return {

                    action: `presses on despite the caution raised earlier`,

                    consequence: `things become a little riskier at ${state.location}`,

                    threadResolved: state.unresolvedThreads.find(t => t.startsWith("a caution"))

                };

            case "explored":

                return problem ? {

                    action: `looks around for anything connected to ${problem}`,

                    consequence: `notices something that might matter`,

                    threadIntroduced: `a detail noticed while looking into ${problem}`

                } : {

                    action: `explores further at ${state.location}`,

                    consequence: `notices something worth being careful about`,

                    threadIntroduced: `a caution noticed while exploring ${state.location}`

                };

            case "observed":

            default:

                return problem ? {

                    action: `looks closely, thinking about ${problem}`,

                    consequence: `notices a detail that might matter later`

                } : {

                    action: candidate.narrativeSeed,

                    consequence: `takes note of the details at ${state.location}`

                };

        }

    }

}
