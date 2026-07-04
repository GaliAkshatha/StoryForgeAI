import { AgentContext } from "@storyforge/agent-sdk";

import { AgentRegistry } from "../registry/AgentRegistry";
import { Workflow } from "../models/Workflow";
import { ExecutionResult } from "../models/ExecutionResult";

export class WorkflowEngine {

    constructor(
        private readonly registry: AgentRegistry
    ) {}

    async execute(
        workflow: Workflow,
        context: AgentContext
    ): Promise<ExecutionResult> {

        const completedSteps: string[] = [];

        const startedAt = new Date();

        try {

            for (const step of workflow.steps) {

                const agent = this.registry.get(
                    step.agentId
                );

                await agent.run(context);

                completedSteps.push(step.id);

            }

            return {

                success: true,

                workflowId: workflow.id,

                completedSteps,

                startedAt,

                finishedAt: new Date()

            };

        }

        catch(error){

            return{

                success:false,

                workflowId:workflow.id,

                completedSteps,

                failedStep:completedSteps.at(-1),

                error:error instanceof Error
                    ? error.message
                    : "Unknown Error",

                startedAt,

                finishedAt:new Date()

            };

        }

    }

}