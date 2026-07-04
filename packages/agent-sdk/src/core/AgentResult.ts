export interface AgentResult<T = unknown>
{
    success: boolean;

    output? : T;

    error?: string;

    logs: string[];

    metrics: {
        executionTimeMs: number;
        tokenUsage?: number;
    }
}