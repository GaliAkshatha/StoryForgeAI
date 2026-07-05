import { PromptRepository } from "./PromptRepository";

import { PlannerPrompt } from "../templates/planner.prompt";

export function createPromptRepository(): PromptRepository {

    const repository = new PromptRepository();

    repository.register(PlannerPrompt);

    return repository;

}