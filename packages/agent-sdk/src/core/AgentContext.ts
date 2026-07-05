export interface AgentContext<TInput = unknown> {

    projectId: string;

    workflowRunId: string;

    executionId: string;

    agentName: string;

    input: TInput;

    sharedMemory: Record<string, unknown>;

    config: Record<string, unknown>;

    metadata: {
        startedAt: Date;
        retryCount: number;
    };

}