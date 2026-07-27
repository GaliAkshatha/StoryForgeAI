export interface Reflection {

    question: string;

    followUpQuestions: string[];

    // Thematic tags observed in the child's decision (e.g.
    // "honesty", "courage", "teamwork"). These are narrative themes,
    // never a personality diagnosis.
    observedThemes: string[];

    encouragement: string;

}
