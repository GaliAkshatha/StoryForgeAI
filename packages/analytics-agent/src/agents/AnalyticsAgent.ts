import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import { LearningAnalytics, SkillSignal } from "@storyforge/shared";

import { JsonParser } from "@storyforge/llm-client";

import { AnalyticsInput } from "../models/AnalyticsInput";
import { AIServices } from "../services/AIServices";

const ANALYTICS_KEY = "learningAnalytics";

// The LLM-authored shape -- deliberately narrower than the public
// LearningAnalytics model. sessionId/childId/generatedAt are facts
// owned by the platform, not the LLM, so they are attached
// afterwards rather than trusted from the model's output.
interface AnalyticsLLMOutput {

    skillSignals: SkillSignal[];

    behaviorNotes: string[];

    summary: string;

}

export class AnalyticsAgent extends BaseAgent<
    AnalyticsInput,
    LearningAnalytics
> {

    constructor(
        memory: MemoryClient,
        private readonly ai: AIServices
    ) {
        super(memory);
    }

    protected async execute(
        context: AgentContext<AnalyticsInput>
    ): Promise<LearningAnalytics> {

        if (context.input.events.length === 0) {

            throw new Error(
                "AnalyticsAgent: at least one session event is required."
            );

        }

        const sessionEvents = context.input.events

            .map((event, index) =>
                `Event ${index + 1}:\n` +
                `Situation: ${event.situation}\n` +
                `Decision: ${event.decisionText}\n` +
                `Consequence: ${event.consequenceNarrative}` +
                (event.reflectionQuestion
                    ? `\nReflection Question Asked: ${event.reflectionQuestion}`
                    : "") +
                (event.learningSignals && event.learningSignals.length > 0
                    ? `\nSignals Noted By Narrator: ${event.learningSignals.join(", ")}`
                    : "")
            )

            .join("\n\n");

        const prompt = this.ai.promptManager.compile(
            "analytics",
            {
                sessionEvents
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json"

        });

        let llmOutput: AnalyticsLLMOutput;

        try {

            llmOutput = JsonParser.parse<AnalyticsLLMOutput>(
                response.text
            );

        }
        catch (error) {

            throw new Error(
                `AnalyticsAgent: Invalid JSON response.\n${error}`
            );

        }

        this.validateLLMOutput(llmOutput);

        const analytics: LearningAnalytics = {

            sessionId: context.input.sessionId,

            childId: context.input.childId,

            skillSignals: llmOutput.skillSignals,

            behaviorNotes: llmOutput.behaviorNotes,

            summary: llmOutput.summary,

            generatedAt: new Date().toISOString()

        };

        this.memory.set(
            ANALYTICS_KEY,
            analytics
        );

        return analytics;

    }

    private validateLLMOutput(
        output: AnalyticsLLMOutput
    ): void {

        if (!Array.isArray(output.skillSignals)) {
            throw new Error("Analytics output missing skillSignals.");
        }

        for (const signal of output.skillSignals) {

            if (
                typeof signal.delta !== "number" ||
                signal.delta < -1 ||
                signal.delta > 1
            ) {

                throw new Error(
                    `Analytics output has an out-of-range delta for skill '${signal.skill}'.`
                );

            }

        }

        if (!Array.isArray(output.behaviorNotes)) {
            throw new Error("Analytics output missing behaviorNotes.");
        }

        if (!output.summary) {
            throw new Error("Analytics output missing summary.");
        }

    }

}
