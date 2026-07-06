import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import {
    JsonParser
} from "@storyforge/llm-client";

import {
    StoryCritique
} from "@storyforge/shared";

import {
    WorkflowContext
} from "@storyforge/shared";

import { CriticInput } from "../models/CriticInput";
import { CriticOutput } from "../models/CriticOutput";
import { AIServices } from "../services/AIServices";

const STORY_CRITIQUE_KEY =
    "storyCritique";

export class CriticAgent extends BaseAgent<
    CriticInput,
    CriticOutput
>{

    constructor(

        memory: MemoryClient,

        private readonly ai: AIServices

    ){

        super(memory);

    }

    protected async execute(
        context: AgentContext<CriticInput>
    ): Promise<CriticOutput>{

        const workflow =
            context.input.workflow;


        const prompt =
            this.ai.promptManager.compile(

                "critic",

                {

                    genre:
                        workflow.requirements.genre,

                    audience:
                        JSON.stringify(
                            workflow.requirements.audience,
                            null,
                            2
                        ),

                    moral:
                        workflow.requirements.moral,

                    theme:
                        workflow.requirements.theme,

                    tone:
                        workflow.requirements.tone,

                    storyLength:
                        workflow.requirements.storyLength,

                    title:
                        workflow.plan.title,

                    setting:
                        workflow.plan.setting,

                    characters:
                        JSON.stringify(
                            workflow.plan.characters,
                            null,
                            2
                        ),

                    storyBeats:
                        JSON.stringify(
                            workflow.plan.storyBeats,
                            null,
                            2
                        ),
                    
                        storyTitle:
                            workflow.draftStory?.title ?? "",

                        storyContent:
                            workflow.draftStory?.content ?? "",

                        wordCount:
                            String(
                                workflow.draftStory?.wordCount ?? 0
                            ),
                            
                        version:
                            String(
                                workflow.draftStory?.version ?? 1
                            ),
    
            

                }

            );

        const response =
            await this.ai.llmClient.generate({

                prompt,

                responseFormat: "json"

            });

        const critique =
            JsonParser.parse<StoryCritique>(
                response.text
            );

        this.validateCritique(
            critique
        );

        this.memory.set(

            STORY_CRITIQUE_KEY,

            critique

        );

        return {

            critique

        };

    }

    private validateCritique(
        critique: StoryCritique
    ): void{

        if(
            critique.overallScore === undefined
        ){

            throw new Error(
                "Missing overallScore."
            );

        }

        if(
            !critique.categoryScores
        ){

            throw new Error(
                "Missing categoryScores."
            );

        }

        if(
            !critique.strengths
        ){

            throw new Error(
                "Missing strengths."
            );

        }

        if(
            !critique.weaknesses
        ){

            throw new Error(
                "Missing weaknesses."
            );

        }

        if(
            !critique.suggestions
        ){

            throw new Error(
                "Missing suggestions."
            );

        }

    }

}