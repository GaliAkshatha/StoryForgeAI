import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import { LearningAnalytics } from "@storyforge/shared";

import { JsonParser } from "@storyforge/llm-client";

import { AnalyticsInput } from "../models/AnalyticsInput";
import { AIServices } from "../services/AIServices";

const ANALYTICS_KEY = "learningAnalytics";

// v3: the LLM is only ever asked for a summary sentence -- the
// skillSignals/behaviorNotes it used to invent now arrive
// pre-computed on the input (see AnalyticsInput). This is the same
// class, same package, same place in the pipeline as before; only
// its responsibility narrowed, per Part 4's "Gemini only writes
// explanations."
interface AnalyticsLLMOutput {

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

        if (context.input.skillSignals.length === 0 && context.input.behaviorNotes.length === 0) {

            throw new Error(
                "AnalyticsAgent: at least one skill signal or behavior note is required."
            );

        }

        const skillSignalsText = context.input.skillSignals

            .map(signal =>
                `- ${signal.skill}: delta ${signal.delta.toFixed(2)} -- ${signal.observation}`
            )

            .join("\n") || "(none)";

        const behaviorNotesText = context.input.behaviorNotes

            .map(note => `- ${note}`)

            .join("\n") || "(none)";

        const prompt = this.ai.promptManager.compile(
            "analytics",
            {
                skillSignalsText,
                behaviorNotesText
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            metadata: { caller: "AnalyticsAgent", purpose: "explain_analytics" }

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

        if (!llmOutput.summary) {

            throw new Error("Analytics output missing summary.");

        }

        const analytics: LearningAnalytics = {

            sessionId: context.input.sessionId,

            childId: context.input.childId,

            skillSignals: context.input.skillSignals,

            behaviorNotes: context.input.behaviorNotes,

            summary: llmOutput.summary,

            generatedAt: new Date().toISOString()

        };

        this.memory.set(
            ANALYTICS_KEY,
            analytics
        );

        return analytics;

    }

}
