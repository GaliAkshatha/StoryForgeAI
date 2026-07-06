import { DependencyContainer } from "../container/DependencyContainer";
import { WorkflowRuntime } from "../runtime/WorkflowRuntime";

export interface WorkflowBuilderOptions {

    apiKey: string;

    model: string;

}

export class WorkflowBuilder {

    static create(
        options: WorkflowBuilderOptions
    ): WorkflowRuntime {

        const container =
            new DependencyContainer(

                options.apiKey,

                options.model

            );

        return new WorkflowRuntime(

            container.requirementAgent,

            container.plannerAgent,

            container.researchAgent,

            container.storyAgent,

            container.criticAgent

        );

    }

}