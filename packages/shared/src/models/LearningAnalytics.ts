export interface SkillSignal {

    skill: string;

    // A short, factual, observable description of what the child
    // did -- e.g. "Chose to share supplies with another character
    // before being asked." Never a trait label or diagnosis.
    observation: string;

    // Strength/direction of the observed signal for this skill.
    // -1 (setback) to 1 (strong positive signal). Not a score of the
    // child themselves, only of the in-app behavior.
    delta: number;

}

// Aggregated, observable-behavior-only analytics for a session.
// Per the Master Prompt's Parent Dashboard rules: "Never diagnose
// personality. Report only observable in-app behavior."
export interface LearningAnalytics {

    sessionId: string;

    childId: string;

    skillSignals: SkillSignal[];

    // Plain, factual notes describing what happened in the session
    // (decisions made, consequences encountered). No inference about
    // the child's character or mental state.
    behaviorNotes: string[];

    summary: string;

    generatedAt: string;

}
