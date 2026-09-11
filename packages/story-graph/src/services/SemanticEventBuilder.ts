import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";
import { SemanticEvent } from "../models/SemanticEvent";
import { safeDashFragment, shortenSafely, stripTrailingPunctuation, lowerFirstSafely } from "./TextFragmentUtils";

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

        const content = this.applyCallbackConsequence(
            this.buildContent(candidate, narrativeState, input.actorName),
            narrativeState
        );

        return {

            task: "NARRATE",

            audience: { ageRange: input.ageRange },

            style: {

                tone: narrativeState.theme ?? "fantasy_adventure",

                maxSentences: this.maxSentencesForBeat(narrativeState),

                humor: narrativeState.humor,

                mystery: narrativeState.mystery,

                vocabulary: narrativeState.vocabulary,

                avoidOpenings: narrativeState.recentNarrationOpenings

            },

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

    // Pacing pass: every turn used to get the same 3-sentence cap
    // regardless of what was actually happening -- a quiet
    // exploratory beat and the moment testing the consequence of the
    // child's moral_fork choice read with identical length and
    // rhythm. Small, explicit, reviewable -- same spirit as
    // BEAT_ALIGNED_TYPES in EventScorer.
    private static readonly SENTENCES_BY_BEAT: Record<string, number> = {

        hook: 4,

        complication: 4,

        moral_fork: 5,

        test: 5,

        resolution: 4

    };

    private maxSentencesForBeat(
        state: NarrativeState
    ): number {

        const beat = state.plotOutline?.[state.currentBeatIndex ?? 0]?.beat;

        return beat ? SemanticEventBuilder.SENTENCES_BY_BEAT[beat] ?? 4 : 4;

    }

    // The pedagogical core of this pass: at the "test" beat, the
    // plot outline PROMISES the story will reveal a consequence of
    // what the child chose earlier -- but until now, nothing actually
    // wired that promise to real content. This is the fix: reference
    // the most recently established fact (which, given how beats
    // advance, is what got established at/around the moral_fork
    // turn) explicitly in the consequence text. It's the difference
    // between "then something happened" and "then, because of what
    // Ak did, something happened" -- the latter is what actually
    // teaches that a choice mattered, not just narrates the next
    // generic event. Deterministic: reuses an already-tracked field
    // (establishedFacts), no new state, no LLM call.
    private applyCallbackConsequence(
        content: ContextualContent,
        state: NarrativeState
    ): ContextualContent {

        const currentBeat = state.plotOutline?.[state.currentBeatIndex ?? 0]?.beat;

        if (currentBeat !== "test") {
            return content;
        }

        const priorFact = state.establishedFacts[state.establishedFacts.length - 1];

        if (!priorFact) {
            return content;
        }

        const callback = lowerFirstSafely(priorFact);

        return {

            ...content,

            consequence: `Because ${callback}, ${content.consequence}`

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

                    action: `reach out to help ${target} — ${problem}`,

                    consequence: `${target}'s face floods with relief — your help makes a real difference`,

                    factEstablished: `helped ${target} — ${problem}`

                } : {

                    action: `reach out to help ${target}`,

                    consequence: `${target}'s face floods with relief — your help makes a real difference`,

                    factEstablished: `helped ${target}`

                };

            case "led_team":

                return {

                    action: `step forward and take charge, guiding ${target} — ${problem ?? "through a tricky moment"}`,

                    consequence: `${target} follows your lead with new confidence`,

                    factEstablished: `led ${target} — ${problem ?? "through a difficult moment"}`

                };

            case "shared_resources":

                return {

                    action: problem
                        ? `share something with ${target} — ${problem}`
                        : `share something useful with ${target}`,

                    consequence: `${target} looks grateful — a little more trust settles between you`,

                    factEstablished: `shared something with ${target}`

                };

            case "asked_questions": {

                // If no problem is established yet, asking questions
                // is exactly how one gets established -- otherwise it
                // deepens the existing one.
                const establishesProblem = !problem;

                const topic = problem ?? `what's troubling ${target}`;

                return {

                    action: `lean in and ask ${target} — ${topic}`,

                    consequence: establishesProblem
                        ? `${target} explains what's wrong, voice low and careful`
                        : `${target} says more about ${topic}`,

                    factEstablished: `${target} told you about ${topic}`,

                    problemEstablished: establishesProblem ? topic : undefined

                };

            }

            case "solved_puzzle":

                return problem ? {

                    action: `think it through and find a way forward — ${problem}`,

                    consequence: `things start to shift — ${problem} is no longer standing in the way`,

                    factEstablished: `solved it: ${problem}`,

                    problemResolved: true

                } : {

                    action: `think it through and find a way forward`,

                    consequence: `things start to shift — the obstacle is clearing`,

                    factEstablished: `solved the problem`,

                    problemResolved: true

                };

            case "failed_puzzle":

                return problem ? {

                    action: `try to solve it — ${problem} — but it doesn't quite work`,

                    consequence: `the problem remains, but now you can see something to try again`,

                    threadIntroduced: `an unfinished attempt — ${problem}`

                } : {

                    action: `give it a try, but it doesn't quite work`,

                    consequence: `the problem remains, but now you can see something to try again`,

                    threadIntroduced: `an unfinished attempt`

                };

            case "retried": {

                const priorAttemptRaw = state.unresolvedThreads
                    .find(t => t.startsWith("an unfinished attempt"))
                    ?.replace("an unfinished attempt — ", "")
                    .replace("an unfinished attempt", "");

                const priorAttempt = priorAttemptRaw ? stripTrailingPunctuation(shortenSafely(priorAttemptRaw) ?? "") : "";

                return {

                    action: priorAttempt.length > 0
                        ? `remember what went wrong and try a different way with ${priorAttempt}`
                        : `take a breath and try again`,

                    consequence: "this time it goes differently",

                    threadResolved: state.unresolvedThreads.find(t => t.startsWith("an unfinished attempt"))

                };

            }

            case "ignored_warning":

                return {

                    action: `press on despite the caution raised earlier`,

                    consequence: `things become a little riskier at ${state.location}`,

                    threadResolved: state.unresolvedThreads.find(t => t.startsWith("a caution"))

                };

            case "explored":

                return problem ? {

                    action: `look around — ${problem}`,

                    consequence: `you notice something that might matter`,

                    threadIntroduced: `a detail noticed — ${problem}`

                } : {

                    action: `explore further at ${state.location}`,

                    consequence: `you notice something worth being careful about`,

                    threadIntroduced: `a caution noticed while exploring ${state.location}`

                };

            case "observed":

            default:

                return problem ? {

                    action: `look closely — ${problem}`,

                    consequence: `you notice a detail that might matter later`

                } : {

                    action: candidate.narrativeSeed,

                    consequence: `you take note of the details at ${state.location}`

                };

        }

    }

}
