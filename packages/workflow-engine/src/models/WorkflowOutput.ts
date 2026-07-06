import { WorkflowContext } from "@storyforge/shared";
import { StoryDraft } from "@storyforge/shared";

export interface WorkflowOutput {

    success: boolean;

    workflowContext?: WorkflowContext;

    story?: StoryDraft;

    error?: string;

    executionTimeMs: number;

}