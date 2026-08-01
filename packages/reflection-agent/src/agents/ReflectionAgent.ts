import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import { Reflection } from "@storyforge/shared";

import { JsonParser } from "@storyforge/llm-client";

import { ReflectionInput } from "../models/ReflectionInput";
import { AIServices } from "../services/AIServices";

const REFLECTION_KEY = "reflection";

export class ReflectionAgent extends BaseAgent<
    ReflectionInput,
    Reflection
> {

    constructor(
        memory: MemoryClient,
        private readonly ai: AIServices
    ) {
        super(memory);
    }

    protected async execute(
        context: AgentContext<ReflectionInput>
    ): Promise<Reflection> {

        const prompt = this.ai.promptManager.compile(
            "reflection",
            {
                childName: context.input.childName,
                ageRange: context.input.ageRange,
                moral: context.input.moral,
                situation: context.input.situation,
                decisionText: context.input.decisionText,
                consequenceNarrative: context.input.consequenceNarrative
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json",

            metadata: { caller: "ReflectionAgent", purpose: "generate_reflection" }

        });

        let reflection: Reflection;

        try {

            reflection = JsonParser.parse<Reflection>(
                response.text
            );

        }
        catch (error) {

            throw new Error(
                `ReflectionAgent: Invalid JSON response.\n${error}`
            );

        }

        this.validateReflection(reflection);

        this.memory.set(
            REFLECTION_KEY,
            reflection
        );

        return reflection;

    }

    private validateReflection(
        reflection: Reflection
    ): void {

        if (!reflection.question) {
            throw new Error("Reflection output missing question.");
        }

        if (!Array.isArray(reflection.followUpQuestions)) {
            throw new Error("Reflection output missing followUpQuestions.");
        }

        if (!Array.isArray(reflection.observedThemes)) {
            throw new Error("Reflection output missing observedThemes.");
        }

        if (!reflection.encouragement) {
            throw new Error("Reflection output missing encouragement.");
        }

    }

}
