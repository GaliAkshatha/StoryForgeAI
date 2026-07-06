import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import {
    JsonParser
} from "@storyforge/llm-client";

import {
    ResearchPackage
} from "@storyforge/shared";

import { ResearchInput } from "../models/ResearchInput";
import { ResearchOutput } from "../models/ResearchOutput";
import { AIServices } from "../services/AIServices";

const RESEARCH_KEY = "researchPackage";

export class ResearchAgent extends BaseAgent<
    ResearchInput,
    ResearchOutput
>{

    constructor(
        memory: MemoryClient,
        private readonly ai: AIServices
    ){
        super(memory);
    }

    protected async execute(
        context: AgentContext<ResearchInput>
    ): Promise<ResearchOutput>{

        const plan =
            context.input.plan;

        const prompt =
            this.ai.promptManager.compile(
                "research",
                {

                    title:
                        plan.title,

                    genre:
                        plan.genre,

                    audience:
                        JSON.stringify(
                            plan.targetAudience,
                            null,
                            2
                        ),

                    theme:
                        plan.theme,

                    setting:
                        plan.setting,

                    characters:
                        JSON.stringify(
                            plan.characters,
                            null,
                            2
                        ),

                    storyBeats:
                        JSON.stringify(
                            plan.storyBeats,
                            null,
                            2
                        )

                }
            );

        const response =
            await this.ai.llmClient.generate({

                prompt,

                responseFormat: "json"

            });

        const research =
            JsonParser.parse<ResearchPackage>(
                response.text
            );

        this.validateResearch(
            research
        );

        this.memory.set(
            RESEARCH_KEY,
            research
        );

        return {

            research

        };

    }

    private validateResearch(
        research: ResearchPackage
    ): void{

        if (!research.writingGuidelines.length)
            throw new Error("Missing writing guidelines.");

        if (!research.worldBuildingIdeas.length)
            throw new Error("Missing world building ideas.");

        if (!research.characterDevelopmentIdeas.length)
            throw new Error("Missing character development ideas.");

        if (!research.conflictSuggestions.length)
            throw new Error("Missing conflict suggestions.");

        if (!research.educationalOpportunities.length)
            throw new Error("Missing educational opportunities.");

        if (!research.vocabularyGuidelines.length)
            throw new Error("Missing vocabulary guidelines.");

        if (!research.inspirations.length)
            throw new Error("Missing inspirations.");

    }

}