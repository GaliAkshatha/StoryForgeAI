import {
    DependencyContainer,
    DependencyContainerConfig
} from "../container/DependencyContainer";
import { WorkflowRuntime } from "../runtime/WorkflowRuntime";
import { AdventureRuntime } from "../runtime/AdventureRuntime";

export type WorkflowBuilderOptions = DependencyContainerConfig;

export class WorkflowBuilder {

    // Builds the linear content-generation workflow (Requirement ->
    // Planner -> Research -> Story -> Critic -> Revision). Useful on
    // its own for one-shot story generation, and reused internally
    // by the interactive adventure loop for narration.
    static create(
        options: WorkflowBuilderOptions
    ): WorkflowRuntime {

        const container =
            new DependencyContainer(options);

        return new WorkflowRuntime(

            container.requirementAgent,

            container.plannerAgent,

            container.researchAgent,

            container.storyAgent,

            container.criticAgent

        );

    }

    // Builds the interactive Core Loop described in the Master
    // Prompt: situation -> decision -> Consequence Engine -> Hybrid
    // RAG -> narration -> reflection -> analytics.
    static createAdventure(
        options: WorkflowBuilderOptions
    ): AdventureRuntime {

        const container =
            new DependencyContainer(options);

        return new AdventureRuntime(container);

    }

}
