import { SkillSignal } from "@storyforge/shared";

// v3: scores are computed deterministically by
// @storyforge/learning's DeterministicAnalyticsEngine BEFORE this
// agent ever runs (Part 4: "Generate scores mathematically. Gemini
// only writes explanations."). This agent's job is narrowed to
// exactly that -- it never invents a skillSignal or a delta, only
// explains the ones it's given.
export interface AnalyticsInput {

    sessionId: string;

    childId: string;

    skillSignals: SkillSignal[];

    behaviorNotes: string[];

}
