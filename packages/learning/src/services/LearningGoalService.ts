import { JsonParser } from "@storyforge/llm-client";

import { LearningObjective } from "../models/LearningObjective";
import { AIServices } from "./AIServices";

export interface DeriveObjectiveInput {

    parentGoalText: string;

    ageRange: string;

    aboutChild?: string;

}

// The Master Prompt is explicit: parents describe a goal in their
// own words ("I want my daughter to understand honesty"), never pick
// from a preset list, and the AI converts that into something the
// Consequence Engine can actually use. This service is that
// conversion step -- it never talks to the child, only to whatever
// starts an adventure (the API layer).
export class LearningGoalService {

    constructor(
        private readonly ai: AIServices
    ) {}

    async deriveObjective(
        input: DeriveObjectiveInput
    ): Promise<LearningObjective> {

        if (!input.parentGoalText.trim()) {

            throw new Error(
                "LearningGoalService: parentGoalText is required."
            );

        }

        const prompt = this.ai.promptManager.compile(
            "learning-goal",
            {
                parentGoalText: input.parentGoalText,
                ageRange: input.ageRange,
                aboutChild: input.aboutChild?.trim() || "none provided"
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            metadata: { caller: "LearningGoalService", purpose: "derive_learning_objective" }

        });

        let objective: LearningObjective;

        try {

            objective = JsonParser.parse<LearningObjective>(
                response.text
            );

        }
        catch (error) {

            throw new Error(
                `LearningGoalService: Invalid JSON response.\n${error}`
            );

        }

        this.validate(objective);

        return objective;

    }

    private validate(
        objective: LearningObjective
    ): void {

        if (!objective.moral) {
            throw new Error("LearningObjective missing moral.");
        }

        if (!Array.isArray(objective.skillFocus) || objective.skillFocus.length === 0) {
            throw new Error("LearningObjective missing skillFocus.");
        }

        if (!objective.domain) {
            throw new Error("LearningObjective missing domain.");
        }

        if (!objective.rationale) {
            throw new Error("LearningObjective missing rationale.");
        }

    }

}
