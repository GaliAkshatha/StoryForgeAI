import { AdventureEventType, TraitName } from "@storyforge/shared";

// How strongly each Adventure Event contributes to each of the 14
// canonical traits. Hand-authored, reviewable, and -- critically --
// entirely deterministic: no LLM involved in producing a score, only
// in narrating what the scores already say (see
// AnalyticsExplanationService). Values are per-event strength in
// roughly -1..1, matching the existing SkillSignal.delta convention.
export const EVENT_TRAIT_WEIGHTS: Record<
    AdventureEventType,
    Partial<Record<TraitName, number>>
> = {

    helped_npc: {
        empathy: 0.6,
        collaboration: 0.3,
        communication: 0.2
    },

    ignored_warning: {
        risk_assessment: -0.4,
        decision_confidence: 0.1
    },

    solved_puzzle: {
        problem_solving: 0.7,
        critical_thinking: 0.5
    },

    asked_questions: {
        curiosity: 0.6,
        communication: 0.3,
        observation: 0.2
    },

    shared_resources: {
        collaboration: 0.6,
        empathy: 0.4,
        responsibility: 0.2
    },

    led_team: {
        leadership: 0.8,
        initiative: 0.5,
        communication: 0.3
    },

    failed_puzzle: {
        persistence: 0.1,
        critical_thinking: 0.1
    },

    retried: {
        persistence: 0.7,
        decision_confidence: 0.3
    },

    explored: {
        curiosity: 0.7,
        initiative: 0.3,
        observation: 0.3
    },

    observed: {
        observation: 0.7,
        critical_thinking: 0.2
    }

};
