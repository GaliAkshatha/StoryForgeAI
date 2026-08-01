/**
 * @deprecated Phase O (deterministic-first migration audit): this
 * class is no longer reachable from any live API route. It was part
 * of the original linear content-generation pipeline
 * (Requirement -> Planner -> Research -> Story -> Critic), fully
 * superseded by the graph-based AdventureRuntime + Story Graph.
 * Not deleted -- real, tested code kept in case a standalone
 * "generate a story to read" feature (distinct from the
 * interactive adventure) is wanted later. See AppContainer for
 * where this used to be constructed.
 */
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

            responseFormat: "json",

                metadata: { caller: "PlannerAgent", purpose: "plan_story" }

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