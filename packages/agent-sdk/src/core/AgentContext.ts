export interface AgentContext {
    projectId: string;
    workflowRunId: string;
    executionId: string;

    agentName: string;

    input: unknown;

    sharedMemory: Record<string, unknown>;

    config: Record<string, unknown>;

    metadata: {
        startedAt: Date;
        retryCount: number;
    };
}