export interface ExecutionResult {

    success: boolean;

    workflowId: string;

    completedSteps: string[];

    failedStep?: string;

    error?: string;

    startedAt: Date;

    finishedAt: Date;

}