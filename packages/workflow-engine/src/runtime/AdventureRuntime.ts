import { DependencyContainer } from "../container/DependencyContainer";
import { AgentContextFactory } from "../utils/AgentContextFactory";

import {
    createInitialWorldState,
    ChildDecision
} from "@storyforge/simulation-engine";

import { SessionEvent } from "@storyforge/analytics-agent";

import {
    StartAdventureInput,
    StartAdventureOutput,
    AdventureTurnInput,
    AdventureTurnOutput
} from "../models/AdventureTurn";

// Implements the Core Loop:
//
//   Parent creates profile -> Child starts adventure -> World
//   initialized -> Situation presented -> Child decides ->
//   Consequence Engine updates World State -> Hybrid RAG retrieves
//   knowledge -> LLM reasons on updated state -> Narration +
//   Dialogue + Reflection -> Learning Analytics updated -> Parent
//   Dashboard updated -> Repeat.
//
// "World initialized" through "Child decides" happen outside this
// class (Parent/Child domain, not yet built -- see startAdventure
// for where a world is created). Everything from "Consequence
// Engine updates World State" onward is implemented here.
//
// Turn-by-turn history is read from and written to
// container.storyTurnRepository rather than kept in memory here --
// as of v2.0 this survives a server restart when the container is
// wired with a Postgres-backed repository.
//
// v2.0: the child never free-types a decision. Every response
// carries exactly 4 choices; playTurn only ever receives the id of
// one of them, resolved against the WorldState's currentChoices.
export class AdventureRuntime {

    constructor(
        private readonly container: DependencyContainer
    ) {}

    async startAdventure(
        input: StartAdventureInput
    ): Promise<StartAdventureOutput> {

        const worldId = crypto.randomUUID();

        const sessionId = crypto.randomUUID();

        const worldState = createInitialWorldState({

            worldId,

            childId: input.childId,

            location: input.location,

            moral: input.moral,

            domain: input.domain

        });

        const knowledgeContext =
            await this.container.knowledgeBase.queryAsContext(

                `${input.location} ${input.moral}`,

                { topK: 5, domain: input.domain }

            );

        const opening =
            await this.container.consequenceEngine.openAdventure(

                worldState,

                {

                    childName: input.childName,

                    ageRange: input.ageRange,

                    aboutChild: input.aboutChild

                },

                { knowledgeContext }

            );

        await this.container.worldStateStore.create(
            opening.worldStateAfter
        );

        return {

            worldId,

            sessionId,

            narrative: opening.narrative,

            choices: opening.choices,

            emotionalTone: opening.emotionalTone

        };

    }

    async playTurn(
        input: AdventureTurnInput
    ): Promise<AdventureTurnOutput> {

        const worldState =
            await this.container.worldStateStore.get(input.worldId);

        if (!worldState) {

            throw new Error(
                `AdventureRuntime: World '${input.worldId}' not found. Call startAdventure first.`
            );

        }

        const selectedChoice = worldState.currentChoices.find(
            choice => choice.id === input.selectedChoiceId
        );

        if (!selectedChoice) {

            throw new Error(
                `AdventureRuntime: '${input.selectedChoiceId}' is not one of the choices currently offered for this world.`
            );

        }

        // ----------------------------------------------------
        // Hybrid RAG: retrieve grounding knowledge for this
        // situation/decision, scoped to the adventure's learning
        // domain, before reasoning about the consequence.
        // ----------------------------------------------------

        const knowledgeContext =
            await this.container.knowledgeBase.queryAsContext(

                `${worldState.currentNarrative} ${selectedChoice.text}`,

                { topK: 5, domain: worldState.domain }

            );

        // ----------------------------------------------------
        // Consequence Engine: deterministic simulation + LLM
        // reasoning, producing the updated World State (the source
        // of truth), the next 4 choices, and a narrative description
        // of what happened.
        // ----------------------------------------------------

        const decision: ChildDecision = {

            situationId: worldState.turn.toString(),

            situationText: worldState.currentNarrative,

            optionId: selectedChoice.id,

            optionText: selectedChoice.text

        };

        const consequence =
            await this.container.consequenceEngine.resolve(

                worldState,

                decision,

                {

                    childName: input.childName,

                    ageRange: input.ageRange,

                    aboutChild: input.aboutChild

                },

                { knowledgeContext }

            );

        await this.container.worldStateStore.save(
            consequence.worldStateAfter
        );

        // ----------------------------------------------------
        // Reflection: an age-appropriate question for the child,
        // tied to the adventure's moral and what just happened.
        // ----------------------------------------------------

        const reflectionResult =
            await this.container.reflectionAgent.run(

                AgentContextFactory.create(

                    input.worldId,

                    "ReflectionAgent",

                    {

                        childName: input.childName,

                        ageRange: input.ageRange,

                        situation: worldState.currentNarrative,

                        decisionText: selectedChoice.text,

                        consequenceNarrative: consequence.narrative,

                        moral: worldState.moral

                    }

                )

            );

        if (!reflectionResult.success) {

            throw new Error(
                `AdventureRuntime: ReflectionAgent failed: ${reflectionResult.error}`
            );

        }

        const reflection = reflectionResult.output!;

        // ----------------------------------------------------
        // Learning Analytics: observable-behavior-only summary of
        // the session so far, feeding the Parent Dashboard.
        // ----------------------------------------------------

        await this.container.storyTurnRepository.append({

            id: crypto.randomUUID(),

            worldId: input.worldId,

            sessionId: input.sessionId,

            childId: input.childId,

            situationText: worldState.currentNarrative,

            decisionText: selectedChoice.text,

            consequenceNarrative: consequence.narrative,

            reflectionQuestion: reflection.question,

            learningSignals: consequence.learningSignals,

            createdAt: new Date().toISOString()

        });

        const turns =
            await this.container.storyTurnRepository.findBySessionId(
                input.sessionId
            );

        const events: SessionEvent[] = turns.map(turn => ({

            situation: turn.situationText,

            decisionText: turn.decisionText,

            consequenceNarrative: turn.consequenceNarrative,

            reflectionQuestion: turn.reflectionQuestion,

            learningSignals: turn.learningSignals

        }));

        const analyticsResult =
            await this.container.analyticsAgent.run(

                AgentContextFactory.create(

                    input.worldId,

                    "AnalyticsAgent",

                    {

                        sessionId: input.sessionId,

                        childId: input.childId,

                        events

                    }

                )

            );

        if (!analyticsResult.success) {

            throw new Error(
                `AdventureRuntime: AnalyticsAgent failed: ${analyticsResult.error}`
            );

        }

        const analytics = analyticsResult.output!;

        return {

            narrative: consequence.narrative,

            choices: consequence.choices,

            emotionalTone: consequence.emotionalTone,

            worldUpdate: consequence.worldUpdate,

            learningSignals: consequence.learningSignals,

            reflection,

            analytics

        };

    }

}
