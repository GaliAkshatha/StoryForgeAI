import { PromptRepository } from "./PromptRepository";

import { PlannerPrompt } from "../templates/planner.prompt";
import { RequirementPrompt } from "../templates/requirement.prompt";
import { ResearchPrompt } from "../templates/research.prompt";
import { StoryPrompt } from "../templates/story.prompt";
import { CriticPrompt } from "../templates/critic.prompt";

export function createPromptRepository(): PromptRepository {

    const repository = new PromptRepository();

    repository.register(
        PlannerPrompt
    );

    repository.register(
        RequirementPrompt
    );

    repository.register(
        ResearchPrompt
    );

    repository.register(
        StoryPrompt
    );

    repository.register(
        CriticPrompt
    );
    return repository;

}