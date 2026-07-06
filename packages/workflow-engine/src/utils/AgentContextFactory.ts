import { AgentContext } from "@storyforge/agent-sdk";

export class AgentContextFactory {

    static create<T>(

        projectId: string,

        agentName: string,

        input: T

    ): AgentContext<T> {

        return {

            projectId,

            workflowRunId:
                crypto.randomUUID(),

            executionId:
                crypto.randomUUID(),

            agentName,

            input,

            sharedMemory: {},

            config: {},

            metadata: {

                startedAt: new Date(),

                retryCount: 0

            }

        };

    }

}