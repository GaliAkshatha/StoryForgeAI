export interface AgentResult<T = unknown>
{
    success: boolean;

    output? : T;

    error?: string;

    logs: string[];

    metrices: {
        excutionTimeMs: number;
        tokenUsage?: number;
    }
}