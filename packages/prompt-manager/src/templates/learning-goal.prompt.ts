import { PromptTemplate } from "../models/PromptTemplate";

export const LearningGoalPrompt: PromptTemplate = {

    id: "learning-goal",

    version: "1.0.0",

    description: "Converts a parent's free-form learning goal into a structured objective for the Consequence Engine.",

    template: `
You are StoryForge AI's Learning Goal interpreter.

A parent has described, in their own words, what they'd like their
child to work on. Your job is to turn that into something a story
can actually teach THROUGH EXPERIENCE -- never by lecturing.

Parent's goal, in their own words:
{{parentGoalText}}

Child's age range: {{ageRange}}

About the child (may say "none provided" -- optional context the
parent shared, e.g. interests, temperament):
{{aboutChild}}

Rules:
- moral must be phrased as a lived principle a child could discover through a decision and its consequence -- NOT as an instruction, NOT containing words like "teach", "lesson", or "should learn". Think: what has to happen in a story for this to click for a kid, not what to tell them.
- skillFocus: 1-3 short lowercase tags for the underlying value(s) (e.g. "honesty", "resilience", "confidence"). Use the parent's own sense of what they mean, even if it's not a common word.
- domain: pick the single best fit from leadership, history, cybersecurity, business, science, healthcare, ethics -- or "general" if none clearly fits.
- rationale: one sentence, for the parent only, explaining how you interpreted their goal.
- Return ONLY valid JSON.

Return EXACTLY this JSON shape.

{
    "moral": "",
    "skillFocus": [""],
    "domain": "",
    "rationale": ""
}

Return ONLY JSON.
`

};
