import { TraitName } from "@storyforge/shared";

// Part 7: instead of a single flat goal like "Leadership", each
// canonical goal decomposes into the sub-skills that build toward
// it. Purely a lookup table -- no LLM involved -- read by
// GoalPlannerService to turn already-computed SkillGrowthPoints into
// a tree view.
export const GOAL_HIERARCHY: Partial<Record<TraitName, TraitName[]>> = {

    leadership: ["communication", "initiative", "responsibility", "collaboration"],

    problem_solving: ["critical_thinking", "observation", "creativity"],

    empathy: ["communication", "observation"],

    persistence: ["decision_confidence", "risk_assessment"]

};

export interface GoalTreeNode {

    skill: TraitName;

    // Average delta across all observations for this skill, or
    // undefined if there's no data yet.
    progress?: number;

    observationCount: number;

    children: GoalTreeNode[];

}
