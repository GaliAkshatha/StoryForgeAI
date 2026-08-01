import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";
import { SemanticEvent } from "../models/SemanticEvent";

export interface SemanticEventBuildInput {

    candidate: CandidateEvent;

    actorName: string;

    ageRange: string;

    aboutChild?: string;

    // Phase 2A: required so the builder can contextualize a valid
    // CandidateEvent using established story information instead of
    // producing a bare, disconnected event-type label.
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
// Division of responsibility (Section 8): ConstraintEngine already
// decided this candidate is POSSIBLE given NarrativeState (e.g.
// problem_established, npc_present against activeCharacterIds). This
// class only decides what a possible event MEANS in the current
// story -- it never re-checks feasibility and never fabricates
// context to justify an event that shouldn't have passed
// ConstraintEngine in the first place.
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

    private buildContent(
        candidate: CandidateEvent,
        state: NarrativeState,
        actorName: string
    ): ContextualContent {

        const target = candidate.targetName;

        const problem = state.currentProblem;

        switch (candidate.type) {

            case "helped_npc":

                // ConstraintEngine already required problem_established
                // and npc_present -- both are safe to reference here.
                return {

                    action: `helps ${target} with ${problem}`,

                    consequence: `${target} is relieved -- ${actorName}'s help makes a real difference with ${problem}`,

                    factEstablished: `${actorName} helped ${target} with ${problem}`

                };

            case "led_team":

                return {

                    action: `takes charge and leads ${target} through ${problem ?? "a tricky moment"}`,

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

                    action: `asks ${target} about ${topic}`,

                    consequence: establishesProblem
                        ? `${target} explains what's wrong`
                        : `${target} shares a new detail about it`,

                    factEstablished: `${target} told ${actorName} about ${topic}`,

                    problemEstablished: establishesProblem ? topic : undefined

                };

            }

            case "solved_puzzle":

                return {

                    action: `figures out how to overcome ${problem}`,

                    consequence: `the obstacle gives way -- ${problem} is no longer in the way`,

                    factEstablished: `${actorName} solved: ${problem}`,

                    problemResolved: true

                };

            case "failed_puzzle":

                return {

                    action: `tries to deal with ${problem}, but it doesn't work`,

                    consequence: `${problem} remains, but now there's something to try again`,

                    threadIntroduced: `an unfinished attempt at ${problem}`

                };

            case "retried":

                return {

                    action: `takes a breath and tries again`,

                    consequence: `this time it goes differently`,

                    threadResolved: state.unresolvedThreads.find(t => t.startsWith("an unfinished attempt"))

                };

            case "ignored_warning":

                return {

                    action: `presses on despite the caution raised earlier`,

                    consequence: `things become a little riskier at ${state.location}`,

                    threadResolved: state.unresolvedThreads.find(t => t.startsWith("a caution"))

                };

            case "explored":

                return {

                    action: `explores further at ${state.location}`,

                    consequence: `notices something worth being careful about`,

                    threadIntroduced: `a caution noticed while exploring ${state.location}`

                };

            case "observed":

            default:

                return {

                    action: candidate.narrativeSeed,

                    consequence: `takes note of the details at ${state.location}`

                };

        }

    }

}
