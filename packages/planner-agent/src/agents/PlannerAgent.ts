import {
    BaseAgent,
    AgentContext,
    MemoryClient
} from "@storyforge/agent-sdk";

import { PlannerInput } from "../models/PlannerInput";
import { PlannerOutput } from "../models/PlannerOutput";

import { AIServices } from "../services/AIServices";
import {
    JsonParser
} from "@storyforge/llm-client";

const STORY_PLAN_KEY = "storyPlan";

export class PlannerAgent extends BaseAgent<
    PlannerInput,
    PlannerOutput
> {

    constructor(
        memory: MemoryClient,
        private readonly ai: AIServices
    ) {
        super(memory);
    }

    protected async execute(
        context: AgentContext<PlannerInput>
    ): Promise<PlannerOutput> {

        const prompt = this.ai.promptManager.compile(
            "planner",
            {
                moral: context.input.moral,
                audience: context.input.audience,
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

        let plan: PlannerOutput;
        
        try {

            plan = JsonParser.parse<PlannerOutput>(
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
        plan: PlannerOutput
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