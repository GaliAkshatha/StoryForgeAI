export interface SkillGrowthPoint {

    skill: string;

    averageDelta: number;

    observationCount: number;

}

// Derived purely by counting/averaging the skillSignals the
// Analytics Agent already produced -- deterministic, no LLM
// involved, so there is no path for this to drift into personality
// diagnosis. It only ever restates what was observed.
export interface LearningRecommendation {

    title: string;

    description: string;

    // Which skill this recommendation is grounded in and why --
    // always traceable back to observed session data.
    basedOnSkill: string;

}

export interface WeeklyTrendPoint {

    weekStart: string;

    weekEnd: string;

    sessionsPlayed: number;

    skillGrowth: SkillGrowthPoint[];

}

export interface WeeklyReport {

    childId: string;

    weekStart: string;

    weekEnd: string;

    sessionsPlayed: number;

    skillGrowth: SkillGrowthPoint[];

    // Verbatim behaviorNotes pulled from the underlying sessions --
    // factual, observable, never editorialized.
    behaviorHighlights: string[];

    recommendations: LearningRecommendation[];

    summary: string;

}
