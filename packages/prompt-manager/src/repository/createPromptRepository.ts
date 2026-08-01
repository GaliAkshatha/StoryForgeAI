import { PromptRepository } from "./PromptRepository";

import { PlannerPrompt } from "../templates/planner.prompt";
import { RequirementPrompt } from "../templates/requirement.prompt";
import { ResearchPrompt } from "../templates/research.prompt";
import { StoryPrompt } from "../templates/story.prompt";
import { CriticPrompt } from "../templates/critic.prompt";
import { ReflectionPrompt } from "../templates/reflection.prompt";
import { AnalyticsPrompt } from "../templates/analytics.prompt";
import { ConsequencePrompt } from "../templates/consequence.prompt";
import { OpeningPrompt } from "../templates/opening.prompt";
import { LearningGoalPrompt } from "../templates/learning-goal.prompt";
import { LearningSummaryPrompt } from "../templates/learning-summary.prompt";
import { AdventureBlueprintPrompt } from "../templates/adventure-blueprint.prompt";
import { AdventureMetadataPrompt } from "../templates/adventure-metadata.prompt";
import { AdventureExpansionPrompt } from "../templates/adventure-expansion.prompt";

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

    repository.register(
        ReflectionPrompt
    );

    repository.register(
        AnalyticsPrompt
    );

    repository.register(
        ConsequencePrompt
    );

    repository.register(
        OpeningPrompt
    );

    repository.register(
        LearningGoalPrompt
    );

    repository.register(
        LearningSummaryPrompt
    );

    repository.register(
        AdventureBlueprintPrompt
    );

    repository.register(
        AdventureMetadataPrompt
    );

    repository.register(
        AdventureExpansionPrompt
    );

    return repository;

}