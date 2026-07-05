import { PromptRepository } from "./PromptRepository";

import { PlannerPrompt } from "../templates/planner.prompt";
import { RequirementPrompt } from "../templates/requirement.prompt";

export function createPromptRepository(): PromptRepository {

    const repository = new PromptRepository();

    repository.register(
        PlannerPrompt
    );

    repository.register(
        RequirementPrompt
    );

    return repository;

}