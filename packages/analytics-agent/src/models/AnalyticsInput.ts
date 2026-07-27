export interface SessionEvent {

    situation: string;

    decisionText: string;

    consequenceNarrative: string;

    reflectionQuestion?: string;

    // Short value tags the Consequence Engine attached to this turn
    // (e.g. "honesty", "empathy") -- additional grounding for the
    // Analytics Agent, not a diagnosis on their own.
    learningSignals?: string[];

}

export interface AnalyticsInput {

    sessionId: string;

    childId: string;

    events: SessionEvent[];

}
