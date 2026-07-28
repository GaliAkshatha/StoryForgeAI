import { TraitName } from "@storyforge/shared";
import { SkillGrowthPoint } from "../models/WeeklyReport";
import { GOAL_HIERARCHY, GoalTreeNode } from "../models/GoalHierarchy";

// Part 7: "Instead of Leadership, create Leadership -> Communication,
// Initiative, Confidence, Responsibility, Teamwork." Purely
// deterministic -- reshapes SkillGrowthPoints (already computed by
// DeterministicAnalyticsEngine) into a tree using GOAL_HIERARCHY, no
// LLM involved.
export class GoalPlannerService {

    buildTree(
        goal: TraitName,
        skillGrowth: SkillGrowthPoint[]
    ): GoalTreeNode {

        const bySkill = new Map(skillGrowth.map(point => [point.skill, point]));

        const children = (GOAL_HIERARCHY[goal] ?? []).map(
            subSkill => this.leafNode(subSkill, bySkill)
        );

        return {

            skill: goal,

            progress: bySkill.get(goal)?.averageDelta,

            observationCount: bySkill.get(goal)?.observationCount ?? 0,

            children

        };

    }

    private leafNode(
        skill: TraitName,
        bySkill: Map<string, SkillGrowthPoint>
    ): GoalTreeNode {

        const point = bySkill.get(skill);

        return {

            skill,

            progress: point?.averageDelta,

            observationCount: point?.observationCount ?? 0,

            children: []

        };

    }

}
