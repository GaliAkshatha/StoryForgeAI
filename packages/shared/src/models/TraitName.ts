// The 14 traits the Deterministic Analytics Engine scores
// mathematically from collected AdventureEvents. Free-form skill
// tags (e.g. a parent's own wording from LearningGoalService) can
// still appear in SkillSignal.skill elsewhere in the platform --
// this list is the canonical, always-scored set Part 4 asks for, not
// an exhaustive enum enforced everywhere.
export type TraitName =
    | "leadership"
    | "curiosity"
    | "creativity"
    | "communication"
    | "problem_solving"
    | "empathy"
    | "persistence"
    | "collaboration"
    | "observation"
    | "critical_thinking"
    | "risk_assessment"
    | "initiative"
    | "responsibility"
    | "decision_confidence";

export const TRAIT_NAMES: TraitName[] = [
    "leadership",
    "curiosity",
    "creativity",
    "communication",
    "problem_solving",
    "empathy",
    "persistence",
    "collaboration",
    "observation",
    "critical_thinking",
    "risk_assessment",
    "initiative",
    "responsibility",
    "decision_confidence"
];
