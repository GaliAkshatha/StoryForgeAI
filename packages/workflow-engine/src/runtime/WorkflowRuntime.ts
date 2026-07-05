import { WorkflowInput } from "../models/WorkflowInput";
import { WorkflowOutput } from "../models/WorkflowOutput";

import { RequirementAgent } from "@storyforge/requirement-agent";
import { PlannerAgent } from "@storyforge/planner-agent";

export class WorkflowRuntime {

    constructor(

        private readonly requirementAgent: RequirementAgent,

        private readonly plannerAgent: PlannerAgent

    ) {}

    async run(
        input: WorkflowInput
    ): Promise<WorkflowOutput> {

        const startedAt = performance.now();

        try {

            const requirementResult =
                await this.requirementAgent.run({

                    projectId: input.projectId,

                    workflowRunId: crypto.randomUUID(),

                    executionId: crypto.randomUUID(),

                    agentName: "RequirementAgent",

                    input: {

                        prompt: input.prompt

                    },

                    sharedMemory: {},

                    config: {},

                    metadata: {

                        startedAt: new Date(),

                        retryCount: 0

                    }

                });

            if (!requirementResult.success) {

                return {

                    success: false,

                    error: requirementResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            const plannerResult =
                await this.plannerAgent.run({

                    projectId: input.projectId,

                    workflowRunId: crypto.randomUUID(),

                    executionId: crypto.randomUUID(),

                    agentName: "PlannerAgent",

                    input: {

                        genre:
                            requirementResult.output!
                                .requirements.genre,

                        audience:
                            requirementResult.output!
                                .requirements.audience,

                        moral:
                            requirementResult.output!
                                .requirements.moral

                    },

                    sharedMemory: {},

                    config: {},

                    metadata: {

                        startedAt: new Date(),

                        retryCount: 0

                    }

                });

            return {

                success:
                    plannerResult.success,

                story:
                    plannerResult.output,

                error:
                    plannerResult.error,

                executionTimeMs:
                    performance.now() - startedAt

            };

        }

        catch (error) {

            return {

                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown Workflow Error",

                executionTimeMs:
                    performance.now() - startedAt

            };

        }

    }

}