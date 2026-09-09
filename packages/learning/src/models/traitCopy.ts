import { TraitName } from "@storyforge/shared";

// Small, explicit, reviewable -- same spirit as EVENT_TRAIT_WEIGHTS.
// Turns a trait key into the copy a parent actually reads. Never a
// diagnosis ("your child is empathetic") -- always framed as
// something observed, with a concrete way to build on it.
export interface TraitCopy {

    label: string;

    // What the pattern actually is, in plain language -- fills in
    // "In N recent adventures, {description}."
    description: string;

    encouragementPrompt: string;

}

export const TRAIT_COPY: Record<TraitName, TraitCopy> = {

    leadership: {
        label: "Taking the Lead",
        description: "you stepped up to guide others through a tricky moment instead of waiting to be told what to do.",
        encouragementPrompt: "Ask your child what made them feel ready to take charge in that moment."
    },

    curiosity: {
        label: "Curiosity",
        description: "you paused to look closer or ask questions before moving on.",
        encouragementPrompt: "Ask your child what they were hoping to find out."
    },

    creativity: {
        label: "Creative Thinking",
        description: "you found an unexpected way through a problem.",
        encouragementPrompt: "Ask your child how they came up with that idea."
    },

    communication: {
        label: "Communication",
        description: "you reached out and talked things through with a character instead of acting alone.",
        encouragementPrompt: "Ask your child what they wanted the other character to understand."
    },

    problem_solving: {
        label: "Problem Solving",
        description: "you worked out a real solution to a problem in the story.",
        encouragementPrompt: "Ask your child to walk you through how they figured it out."
    },

    empathy: {
        label: "Perspective-Taking",
        description: "you paused to understand another character's reasons before deciding what to do.",
        encouragementPrompt: "Ask your child what they think another character might have been feeling or trying to accomplish."
    },

    persistence: {
        label: "Persistence",
        description: "you tried again after something didn't work the first time.",
        encouragementPrompt: "Ask your child what kept them going when the first attempt didn't work."
    },

    collaboration: {
        label: "Collaboration",
        description: "you chose to help or share with someone instead of going it alone.",
        encouragementPrompt: "Ask your child why they chose to help rather than handle it by themselves."
    },

    observation: {
        label: "Careful Observation",
        description: "you noticed small details that ended up mattering.",
        encouragementPrompt: "Ask your child what small clue they noticed that others might have missed."
    },

    critical_thinking: {
        label: "Critical Thinking",
        description: "you weighed a situation carefully before acting.",
        encouragementPrompt: "Ask your child what other options they considered before choosing."
    },

    risk_assessment: {
        label: "Weighing Risks",
        description: "you thought about what could go wrong before deciding how to act.",
        encouragementPrompt: "Ask your child what they were worried might happen."
    },

    initiative: {
        label: "Initiative",
        description: "you acted on your own instead of waiting to be told what to do.",
        encouragementPrompt: "Ask your child what made them want to act right away."
    },

    responsibility: {
        label: "Responsibility",
        description: "you followed through on something you'd taken on.",
        encouragementPrompt: "Ask your child how it felt to see that through."
    },

    decision_confidence: {
        label: "Confident Decisions",
        description: "you made a clear choice without second-guessing it.",
        encouragementPrompt: "Ask your child what made them feel sure about that choice."
    }

};
