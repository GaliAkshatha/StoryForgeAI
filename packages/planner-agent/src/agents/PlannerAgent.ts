import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import { PlannerInput } from "../models/PlannerInput";
import { StoryPlan } from "@storyforge/shared";

import { AIServices } from "../services/AIServices";
import {
    JsonParser
} from "@storyforge/llm-client";

const STORY_PLAN_KEY = "storyPlan";

export class PlannerAgent extends BaseAgent<
    PlannerInput,
    StoryPlan
> {

    constructor(
        memory: MemoryClient,
        private readonly ai: AIServices
    ) {
        super(memory);
    }

    protected async execute(
        context: AgentContext<PlannerInput>
    ): Promise<StoryPlan> {

        const audienceDescription =
            `
            Name: ${context.input.audience.name}
            Age Range: ${context.input.audience.ageRange}
            Reading Level: ${context.input.audience.readingLevel}
            Vocabulary Level: ${context.input.audience.vocabularyLevel}
            `;

        const prompt = this.ai.promptManager.compile(
            "planner",
            {
                moral: context.input.moral,
                audience:  audienceDescription,
                genre: context.input.genre
            }
        );
        console.log(
            this.ai.llmClient.constructor.name
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json"

        });

        let plan: StoryPlan;
        
        try {

            plan = JsonParser.parse<StoryPlan>(
                response.text
            );

        }
        catch(error) {

            throw new Error(
                `PlannerAgent: Invalid JSON response.\n${error}`
            );

        }

        this.validatePlan(plan);

        this.memory.set(
            STORY_PLAN_KEY,
            plan
        );

        return plan;

    }

    private validatePlan(
        plan: StoryPlan
    ): void {

        if (!plan.title)
            throw new Error("Planner output missing title.");

        if (!plan.genre)
            throw new Error("Planner output missing genre.");

        if (!plan.targetAudience)
            throw new Error("Planner output missing targetAudience.");

        if (!plan.moral)
            throw new Error("Planner output missing moral.");

        if (!plan.characters?.length)
            throw new Error("Planner output missing characters.");

        if (!plan.storyBeats?.length)
            throw new Error("Planner output missing storyBeats.");

    }

}