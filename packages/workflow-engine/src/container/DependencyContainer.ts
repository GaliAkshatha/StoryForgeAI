import {
    MemoryStore,
    MemoryClient
} from "@storyforge/agent-sdk";

import {
    GeminiClient
} from "@storyforge/llm-client";

import {
    DefaultPromptManager,
    createPromptRepository
} from "@storyforge/prompt-manager";

import {
    RequirementAgent
} from "@storyforge/requirement-agent";

import {
    PlannerAgent
} from "@storyforge/planner-agent";

import {
    ResearchAgent
} from "@storyforge/research-agent";

import {
    StoryAgent
} from "@storyforge/story-agent";

import {
    CriticAgent
} from "@storyforge/critic-agent";

export class DependencyContainer {

    readonly memoryStore: MemoryStore;

    readonly memory: MemoryClient;

    readonly llm: GeminiClient;

    readonly promptManager: DefaultPromptManager;

    readonly requirementAgent: RequirementAgent;

    readonly plannerAgent: PlannerAgent;

    readonly researchAgent: ResearchAgent;

    readonly storyAgent: StoryAgent;

    readonly criticAgent: CriticAgent;

    constructor(

        apiKey: string,

        model: string

    ){

        this.memoryStore =
            new MemoryStore();

        this.memory =
            new MemoryClient(
                this.memoryStore
            );

        this.promptManager =
            new DefaultPromptManager(

                createPromptRepository()

            );

        this.llm =
            new GeminiClient({

                apiKey,

                model

            });

        const ai = {

            llmClient:
                this.llm,

            promptManager:
                this.promptManager

        };

        this.requirementAgent =
            new RequirementAgent(

                this.memory,

                ai

            );

        this.plannerAgent =
            new PlannerAgent(

                this.memory,

                ai

            );

        this.researchAgent =
            new ResearchAgent(

            this.memory,

            ai

        );

        this.storyAgent =
            new StoryAgent(

                this.memory,

                ai

            );
        

        this.criticAgent =
            new CriticAgent(

                this.memory,

                ai

            );

    }
}