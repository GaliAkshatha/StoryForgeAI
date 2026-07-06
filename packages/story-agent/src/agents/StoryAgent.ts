import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import {
    JsonParser
} from "@storyforge/llm-client";

import {
    StoryDraft
} from "@storyforge/shared";

import { StoryInput } from "../models/StoryInput";
import { StoryOutput } from "../models/StoryOutput";
import { AIServices } from "../services/AIServices";

const STORY_DRAFT_KEY = "storyDraft";

export class StoryAgent extends BaseAgent<
    StoryInput,
    StoryOutput
>{

    constructor(

        memory: MemoryClient,

        private readonly ai: AIServices

    ){

        super(memory);

    }

    protected async execute(
        context: AgentContext<StoryInput>
    ): Promise<StoryOutput>{

        const workflow =
            context.input.workflow;

        const prompt =
            this.ai.promptManager.compile(

                "story",

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

                    readingTime:
                        workflow.plan.estimatedReadingTime,

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

                    writingGuidelines:
                        JSON.stringify(
                            workflow.research.writingGuidelines,
                            null,
                            2
                        ),

                    worldBuildingIdeas:
                        JSON.stringify(
                            workflow.research.worldBuildingIdeas,
                            null,
                            2
                        ),

                    characterDevelopmentIdeas:
                        JSON.stringify(
                            workflow.research.characterDevelopmentIdeas,
                            null,
                            2
                        ),

                    conflictSuggestions:
                        JSON.stringify(
                            workflow.research.conflictSuggestions,
                            null,
                            2
                        ),

                    educationalOpportunities:
                        JSON.stringify(
                            workflow.research.educationalOpportunities,
                            null,
                            2
                        ),

                    vocabularyGuidelines:
                        JSON.stringify(
                            workflow.research.vocabularyGuidelines,
                            null,
                            2
                        ),

                    inspirations:
                        JSON.stringify(
                            workflow.research.inspirations,
                            null,
                            2
                        ),

                    draftStory:
                        workflow.draftStory
                            ? JSON.stringify(
                                workflow.draftStory,
                                null,
                                2
                            )
                            : "",

                    critique:
                        workflow.critique
                        ? JSON.stringify(
                            workflow.critique,
                            null,
                            2
                        )
                        : ""

                }

            );

        const response =
            await this.ai.llmClient.generate({

                prompt,

                responseFormat: "json"

            });

        const story =
            JsonParser.parse<StoryDraft>(
                response.text
            );

        this.validateStory(
            story
        );

        this.memory.set(
            STORY_DRAFT_KEY,
            story
        );

        return {

            story

        };

    }

    private validateStory(
        story: StoryDraft
    ): void{

        if(!story.title)
            throw new Error(
                "Missing story title."
            );

        if(!story.content)
            throw new Error(
                "Missing story content."
            );

        if(story.wordCount <= 0)
            throw new Error(
                "Invalid word count."
            );

        if(story.version <= 0)
            throw new Error(
                "Invalid version."
            );

    }

}