// A deterministically-unlocked milestone (see AchievementEngine in
// @storyforge/learning) -- never LLM-decided, so unlocking is always
// explainable and reproducible from the same underlying data the
// Deterministic Analytics Engine already scores.
export interface Achievement {

    id: string;

    childId: string;

    // Stable machine key (e.g. "first_adventure_completed",
    // "empathy_streak_5") -- used to check "has this already been
    // unlocked" without depending on display text.
    key: string;

    title: string;

    description: string;

    unlockedAt: string;

}
