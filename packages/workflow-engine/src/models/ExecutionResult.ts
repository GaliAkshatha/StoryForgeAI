export interface ExecutionResult {

    success: boolean;

    completedSteps: string[];

    failedStep?: string;

    error?: string;

}