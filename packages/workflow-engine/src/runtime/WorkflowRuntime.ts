import { WorkflowInput } from "../models/WorkflowInput";
import { WorkflowOutput } from "../models/WorkflowOutput";
import { AgentContextFactory } from "../utils/AgentContextFactory";

import { RequirementAgent } from "@storyforge/requirement-agent";
import { PlannerAgent } from "@storyforge/planner-agent";
import { ResearchAgent } from "@storyforge/research-agent";
import { StoryAgent } from "@storyforge/story-agent";
import { CriticAgent } from "@storyforge/critic-agent";

import { WorkflowContext } from "@storyforge/shared";

export class WorkflowRuntime {

    constructor(

        private readonly requirementAgent: RequirementAgent,

        private readonly plannerAgent: PlannerAgent,

        private readonly researchAgent: ResearchAgent,

        private readonly storyAgent: StoryAgent,

        private readonly criticAgent: CriticAgent

    ) {}

    async run(
        input: WorkflowInput
    ): Promise<WorkflowOutput> {

        const startedAt = performance.now();

        try {

            // ----------------------------------
            // Requirement Agent
            // ----------------------------------

            const requirementResult =
                await this.requirementAgent.run(

                    AgentContextFactory.create(

                        input.projectId,

                        "RequirementAgent",

                        {

                            prompt:
                                input.prompt

                        }

                    )

                );

            if (!requirementResult.success) {

                return {

                    success: false,

                    error:
                        requirementResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            // ----------------------------------
            // Planner Agent
            // ----------------------------------

            const plannerResult =
                await this.plannerAgent.run(

                    AgentContextFactory.create(

                        input.projectId,

                        "PlannerAgent",

                        {

                            genre:
                                requirementResult.output!.requirements.genre,

                            audience:
                                requirementResult.output!.requirements.audience,

                            moral:
                                requirementResult.output!.requirements.moral

                        }

                    )

                );

            if (!plannerResult.success) {

                return {

                    success: false,

                    error:
                        plannerResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            const plan =
                plannerResult.output!;

            // ----------------------------------
            // Research Agent
            // ----------------------------------

            const researchResult =
                await this.researchAgent.run(

                    AgentContextFactory.create(

                        input.projectId,

                        "ResearchAgent",

                        {

                            plan

                        }

                    )

                );

            if (!researchResult.success) {

                return {

                    success: false,

                    error:
                        researchResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            // ----------------------------------
            // Shared Workflow Context
            // ----------------------------------

            const workflowContext: WorkflowContext = {

                requirements:
                    requirementResult.output!.requirements,

                plan,

                research:
                    researchResult.output!.research

            };

            // ----------------------------------
            // Story Draft
            // ----------------------------------

            const storyResult =
                await this.storyAgent.run(

                    AgentContextFactory.create(

                        input.projectId,

                        "StoryAgent",

                        {

                            workflow:
                                workflowContext

                        }

                    )

                );

            if (!storyResult.success) {

                return {

                    success: false,

                    error:
                        storyResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            workflowContext.draftStory =
                storyResult.output!.story;

            // ----------------------------------
            // Critic
            // ----------------------------------

            const critiqueResult =
                await this.criticAgent.run(

                    AgentContextFactory.create(

                        input.projectId,

                        "CriticAgent",

                        {

                            workflow:
                                workflowContext

                        }

                    )

                );

            if (!critiqueResult.success) {

                return {

                    success: false,

                    error:
                        critiqueResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            workflowContext.critique =
                critiqueResult.output!.critique;

            // ----------------------------------
            // Story Revision
            // ----------------------------------

            const revisionResult =
                await this.storyAgent.run(

                    AgentContextFactory.create(

                        input.projectId,

                        "StoryAgent",

                        {

                            workflow:
                                workflowContext

                        }

                    )

                );

            if (!revisionResult.success) {

                return {

                    success: false,

                    error:
                        revisionResult.error,

                    executionTimeMs:
                        performance.now() - startedAt

                };

            }

            workflowContext.finalStory =
                revisionResult.output!.story;

            // ----------------------------------
            // Final Result
            // ----------------------------------

            return {

                success: true,

                story:
                    workflowContext.finalStory,

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