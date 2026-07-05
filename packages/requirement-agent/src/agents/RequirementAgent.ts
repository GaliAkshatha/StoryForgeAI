import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import {
    JsonParser
} from "@storyforge/llm-client";

import { RequirementInput } from "../models/RequirementInput";
import { RequirementOutput } from "../models/RequirementOutput";

import { AIServices } from "../services/AIServices";
import { StoryRequirements } from "@storyforge/shared";

const STORY_REQUIREMENTS_KEY = "storyRequirements";

export class RequirementAgent extends BaseAgent<
    RequirementInput,
    RequirementOutput
>{

    constructor(
        memory: MemoryClient,
        private readonly ai: AIServices
    ){
        super(memory);
    }

    protected async execute(
        context: AgentContext<RequirementInput>
    ): Promise<RequirementOutput>{

        const prompt =
            this.ai.promptManager.compile(
                "requirement",
                {
                    prompt: context.input.prompt
                }
            );

        const response =
            await this.ai.llmClient.generate({

                prompt,

                responseFormat: "json"

            });

        const requirements =
            JsonParser.parse<StoryRequirements>(
                response.text
            );

        this.validateRequirements(
            requirements
        );

        this.memory.set(
            STORY_REQUIREMENTS_KEY,
            requirements
        );

        return {

            requirements

        };

    }

    private validateRequirements(
        requirements: any
    ): void{

        if(!requirements.genre)
            throw new Error("Missing genre.");

        if(!requirements.audience)
            throw new Error("Missing audience.");

        if (!requirements.audience.name)
            throw new Error("Missing audience.name.");

        if (!requirements.audience.ageRange)
            throw new Error("Missing audience.ageRange.");

        if (!requirements.audience.readingLevel)
            throw new Error("Missing audience.readingLevel.");

        if (!requirements.audience.vocabularyLevel)
            throw new Error("Missing audience.vocabularyLevel.");

        if(!requirements.moral)
            throw new Error("Missing moral.");

        if(!requirements.tone)
            throw new Error("Missing tone.");

        if(!requirements.theme)
            throw new Error("Missing theme.");

        if(!requirements.storyLength)
            throw new Error("Missing storyLength.");

        if(!requirements.audience.readingLevel)
            throw new Error("Missing audience.readingLevel.");

    }

}