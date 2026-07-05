export interface WorkflowOutput {

    success: boolean;

    story?: unknown;

    error?: string;

    executionTimeMs: number;

}