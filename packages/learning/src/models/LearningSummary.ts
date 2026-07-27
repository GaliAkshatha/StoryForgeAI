// The AI-generated companion to the deterministic WeeklyReport/trend
// data -- strictly narrating patterns already present in
// skillGrowth/behaviorHighlights, never inventing or diagnosing.
// Matches the Master Prompt's example: "Your child consistently
// chooses to help others. This month empathy increased. Confidence
// is improving. Suggested next goal: Leadership."
export interface LearningSummary {

    headline: string;

    // Each entry describes one observable trend, grounded in the
    // numeric data the caller provided (e.g. "This month empathy
    // increased.").
    trendHighlights: string[];

    suggestedNextGoal: string;

    suggestedNextGoalRationale: string;

}
