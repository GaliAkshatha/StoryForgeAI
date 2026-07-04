import { WorkflowStep } from "./WorkflowStep";

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
}