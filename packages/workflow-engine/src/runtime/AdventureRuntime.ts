import { DependencyContainer } from "../container/DependencyContainer";
import { AgentContextFactory } from "../utils/AgentContextFactory";

import {
    createInitialWorldState,
    DeterministicSimulator,
    RelationshipStatus
} from "@storyforge/simulation-engine";

import { StoryNode } from "@storyforge/story-graph";

import { Reflection, LearningAnalytics } from "@storyforge/shared";

import {
    StartAdventureInput,
    StartAdventureOutput,
    AdventureTurnInput,
    AdventureTurnOutput
} from "../models/AdventureTurn";

// Fewer than this many non-ending nodes still reachable ahead of the
// child's current position triggers a background expansion (Part
// 1's "Remaining Nodes < Threshold -> Background Expansion").
const EXPANSION_THRESHOLD = 3;

// v3 Core Loop: gameplay is graph TRAVERSAL, not generation.
//
//   Parent creates profile -> Child starts adventure -> ONE
//   expensive AdventureBlueprintGenerator call produces a complete
//   Story Graph, persisted in full -> Situation presented (render
//   the root StoryNode) -> Child picks a choice -> Graph traversal
//   (look up the next StoryNode by id -- no AI call) -> Deterministic
//   effects applied -> an Adventure Event is recorded if the node is
//   tagged with one (no AI call) -> Render -> Repeat. Reflection and
//   Analytics run ONLY when a chapter ends (Part 3/4), reading from
//   the collected events instead of running every turn.
//
// The ONLY LLM calls during play are: (1) once, in startAdventure,
// (2) occasionally, when the graph is nearly exhausted, in
// maybeExpandGraph, and (3) once per chapter ending, for Reflection
// + the Analytics explanation. Every other turn is pure repository
// reads plus DeterministicSimulator -- the same simulator v2.0
// already built and validated, unchanged here.
export class AdventureRuntime {

    private readonly simulator = new DeterministicSimulator();

    constructor(
        private readonly container: DependencyContainer
    ) {}

    async startAdventure(
        input: StartAdventureInput
    ): Promise<StartAdventureOutput> {

        const worldId = crypto.randomUUID();

        const sessionId = crypto.randomUUID();

        const knowledgeContext =
            await this.container.knowledgeBase.queryAsContext(

                `${input.location} ${input.moral}`,

                { topK: 5, domain: input.domain }

            );

        // The one expensive generation for this adventure, plus
        // persistence and root-node resolution -- all handled by
        // AdventureCompiler now instead of being orchestrated inline
        // here.
        const compiled =
            await this.container.adventureCompiler.compile(

                {

                    childId: input.childId,

                    childName: input.childName,

                    ageRange: input.ageRange,

                    aboutChild: input.aboutChild,

                    location: input.location,

                    moral: input.moral,

                    domain: input.domain

                },

                { knowledgeContext }

            );

        const { adventure, rootNode } = compiled;

        let worldState = createInitialWorldState({

            worldId,

            childId: input.childId,

            location: input.location,

            moral: input.moral,

            domain: input.domain

        });

        const simulation = this.simulator.apply(worldState, rootNode.effects);

        worldState = {

            ...simulation.state,

            adventureId: adventure.id,

            currentNodeId: rootNode.id,

            currentNarrative: rootNode.narrative,

            currentChoices: rootNode.choices.map(choice => ({

                id: choice.id,

                text: choice.text

            }))

        };

        await this.container.worldStateStore.create(worldState);

        return {

            worldId,

            sessionId,

            narrative: rootNode.narrative,

            choices: worldState.currentChoices,

            isEnding: rootNode.isEnding,

            emotionalTone: this.dominantEmotion(rootNode)

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

        if (!worldState.adventureId || !worldState.currentNodeId) {

            throw new Error(
                `AdventureRuntime: World '${input.worldId}' has no associated Story Graph position.`
            );

        }

        const adventureId = worldState.adventureId;

        const currentNode = await this.container.storyNodeRepository.findById(
            adventureId,
            worldState.currentNodeId
        );

        if (!currentNode) {

            throw new Error(
                `AdventureRuntime: Story node '${worldState.currentNodeId}' not found for adventure '${adventureId}'.`
            );

        }

        // ----------------------------------------------------
        // Graph traversal: "Current Node -> Child Choice -> Edge
        // Traversal -> Next Node." No AI call -- pure repository
        // reads via GraphTraversalEngine.
        // ----------------------------------------------------

        let selectedChoice, nextNode;

        try {

            const traversal = await this.container.graphTraversalEngine.traverse(
                adventureId,
                currentNode,
                input.selectedChoiceId
            );

            selectedChoice = traversal.choice;

            nextNode = traversal.nextNode;

        }
        catch (error) {

            throw new Error(
                `AdventureRuntime: ${error instanceof Error ? error.message : String(error)}`
            );

        }

        // ----------------------------------------------------
        // Deterministic simulation: the same DeterministicSimulator
        // from v2.0, unchanged -- only the source of the effects
        // being applied changed (a pre-generated node instead of a
        // fresh LLM call).
        // ----------------------------------------------------

        const simulation = this.simulator.apply(worldState, nextNode.effects);

        let updatedWorldState = {

            ...simulation.state,

            currentNodeId: nextNode.id,

            currentNarrative: nextNode.narrative,

            currentChoices: nextNode.choices.map(choice => ({

                id: choice.id,

                text: choice.text

            }))

        };

        await this.container.worldStateStore.save(updatedWorldState);

        // ----------------------------------------------------
        // Background Expansion: only triggers occasionally (when
        // nearing exhaustion), never every turn. Runs synchronously
        // within this request in the current implementation -- there
        // is no separate job queue in this monorepo yet, so "fire
        // and forget" isn't available. The turn that crosses the
        // threshold pays a one-time generation cost; every other
        // turn pays nothing.
        // ----------------------------------------------------

        if (!nextNode.isEnding) {

            nextNode = await this.maybeExpandGraph(
                adventureId,
                nextNode,
                input,
                updatedWorldState.relationships
            );

        }

        // ----------------------------------------------------
        // Emotion Engine (Phase 9): record every turn's emotion, not
        // just eventType-tagged ones -- EmotionTracker.guidance()
        // (used inside maybeExpandGraph) reads this history back.
        // ----------------------------------------------------

        await this.container.emotionTracker.record({

            id: crypto.randomUUID(),

            childId: input.childId,

            sessionId: input.sessionId,

            worldId: input.worldId,

            emotion: nextNode.emotion,

            recordedAt: new Date().toISOString()

        });

        // ----------------------------------------------------
        // Memory Engine (Phase 10): log a durable, human-readable
        // entry behind any relationship change this node caused --
        // WorldState.relationships already holds the numeric
        // trust/affinity; this is the "why."
        // ----------------------------------------------------

        for (const effect of simulation.appliedEffects) {

            if (effect.type === "relationship.delta") {

                const payload = effect.payload as {
                    characterId: string;
                    characterName: string;
                    trustDelta?: number;
                    affinityDelta?: number;
                };

                const trustDelta = payload.trustDelta ?? 0;

                await this.container.npcMemoryRepository.record({

                    id: crypto.randomUUID(),

                    childId: input.childId,

                    worldId: input.worldId,

                    characterId: payload.characterId,

                    characterName: payload.characterName,

                    eventType: trustDelta >= 0 ? "trust_gained" : "trust_lost",

                    description: nextNode.narrative,

                    createdAt: new Date().toISOString()

                });

            }

        }

        // ----------------------------------------------------
        // Adventure Event: derived deterministically from the node's
        // eventType -- no LLM call. This is the substrate Reflection
        // and Analytics read from below, instead of running fresh
        // every turn (Part 3).
        // ----------------------------------------------------

        if (nextNode.eventType) {

            await this.container.adventureEventRepository.append({

                id: crypto.randomUUID(),

                worldId: input.worldId,

                sessionId: input.sessionId,

                childId: input.childId,

                adventureId,

                nodeId: nextNode.id,

                eventType: nextNode.eventType,

                narrative: nextNode.narrative,

                emotion: nextNode.emotion,

                createdAt: new Date().toISOString()

            });

        }

        // ----------------------------------------------------
        // Reflection + Learning Analytics: Part 3/4 -- these ONLY run
        // when a chapter ends, not every turn. skillSignals are
        // computed mathematically by DeterministicAnalyticsEngine;
        // the LLM (AnalyticsAgent) only writes a plain-language
        // explanation of them, never invents them.
        // ----------------------------------------------------

        let reflection: Reflection | undefined;

        let analytics: LearningAnalytics | undefined;

        const isChapterEnd = nextNode.isEnding;

        if (isChapterEnd) {

            const chapterEvents =
                await this.container.adventureEventRepository.findBySessionId(
                    input.sessionId
                );

            const skillSignals =
                this.container.deterministicAnalyticsEngine.score(
                    chapterEvents.map(event => event.eventType)
                );

            const behaviorNotes = chapterEvents.map(
                event => `${event.eventType.replace(/_/g, " ")}: ${event.narrative}`
            );

            const analyticsResult =
                await this.container.analyticsAgent.run(

                    AgentContextFactory.create(

                        input.worldId,

                        "AnalyticsAgent",

                        {

                            sessionId: input.sessionId,

                            childId: input.childId,

                            skillSignals,

                            behaviorNotes

                        }

                    )

                );

            if (!analyticsResult.success) {

                throw new Error(
                    `AdventureRuntime: AnalyticsAgent failed: ${analyticsResult.error}`
                );

            }

            analytics = analyticsResult.output!;

            const chapterNarrative =
                chapterEvents.length > 0
                    ? chapterEvents.map(event => event.narrative).join(" ")
                    : currentNode.narrative;

            const reflectionResult =
                await this.container.reflectionAgent.run(

                    AgentContextFactory.create(

                        input.worldId,

                        "ReflectionAgent",

                        {

                            childName: input.childName,

                            ageRange: input.ageRange,

                            situation: chapterNarrative,

                            decisionText: selectedChoice.text,

                            consequenceNarrative: nextNode.narrative,

                            moral: worldState.moral

                        }

                    )

                );

            if (!reflectionResult.success) {

                throw new Error(
                    `AdventureRuntime: ReflectionAgent failed: ${reflectionResult.error}`
                );

            }

            reflection = reflectionResult.output!;

            // ------------------------------------------------
            // Achievements (Phases 2/8/13): deterministic milestone
            // unlocking -- never LLM-decided, reproducible from the
            // same data DeterministicAnalyticsEngine already scored.
            // Deliberately a small rule set (not an elaborate engine)
            // for this pass: first-chapter-completed always, plus a
            // per-skill "strong showing" achievement when a signal is
            // clearly positive.
            // ------------------------------------------------

            const alreadyUnlockedFirst = await this.container.achievementRepository.hasUnlocked(
                input.childId,
                "first_chapter_completed"
            );

            if (!alreadyUnlockedFirst) {

                await this.container.achievementRepository.unlock({

                    id: crypto.randomUUID(),

                    childId: input.childId,

                    key: "first_chapter_completed",

                    title: "First Chapter Complete",

                    description: "Finished the first chapter of an adventure.",

                    unlockedAt: new Date().toISOString()

                });

            }

            for (const signal of skillSignals) {

                if (signal.delta < 0.6) {
                    continue;
                }

                const key = `strong_${signal.skill}`;

                const alreadyUnlocked = await this.container.achievementRepository.hasUnlocked(
                    input.childId,
                    key
                );

                if (!alreadyUnlocked) {

                    await this.container.achievementRepository.unlock({

                        id: crypto.randomUUID(),

                        childId: input.childId,

                        key,

                        title: `Strong ${signal.skill.replace(/_/g, " ")}`,

                        description: `Showed a clear, repeated pattern of ${signal.skill.replace(/_/g, " ")} this chapter.`,

                        unlockedAt: new Date().toISOString()

                    });

                }

            }

        }

        // ----------------------------------------------------
        // Turn history: still recorded every turn (full transcript,
        // for history/replay), but reflectionQuestion is only ever
        // set on the turn that actually concluded a chapter.
        // ----------------------------------------------------

        await this.container.storyTurnRepository.append({

            id: crypto.randomUUID(),

            worldId: input.worldId,

            sessionId: input.sessionId,

            childId: input.childId,

            situationText: currentNode.narrative,

            decisionText: selectedChoice.text,

            consequenceNarrative: nextNode.narrative,

            reflectionQuestion: reflection?.question,

            learningSignals: nextNode.learningSignals,

            createdAt: new Date().toISOString()

        });

        // nextNode may have been replaced by maybeExpandGraph (its
        // choices rewritten from an ending into a junction) -- make
        // sure the persisted WorldState and the response both
        // reflect that final version, not the pre-expansion one.
        updatedWorldState = {

            ...updatedWorldState,

            currentChoices: nextNode.choices.map(choice => ({

                id: choice.id,

                text: choice.text

            }))

        };

        await this.container.worldStateStore.save(updatedWorldState);

        return {

            narrative: nextNode.narrative,

            choices: updatedWorldState.currentChoices,

            isEnding: nextNode.isEnding,

            emotionalTone: this.dominantEmotion(nextNode),

            worldUpdate: {

                effects: simulation.appliedEffects,

                turn: updatedWorldState.turn,

                location: updatedWorldState.location

            },

            learningSignals: nextNode.learningSignals,

            reflection,

            analytics

        };

    }

    // Checks whether the graph is running low ahead of the child's
    // current position and, if so, generates and grafts on the next
    // chapter. Returns the (possibly rewritten) current node.
    private async maybeExpandGraph(
        adventureId: string,
        currentNode: StoryNode,
        input: AdventureTurnInput,
        relationships: RelationshipStatus[]
    ): Promise<StoryNode> {

        const allNodes =
            await this.container.storyNodeRepository.findByAdventureId(
                adventureId
            );

        const remaining = this.countReachableNonEndingNodes(
            allNodes,
            currentNode.id
        );

        if (remaining >= EXPANSION_THRESHOLD) {
            return currentNode;
        }

        const adventure =
            await this.container.adventureRepository.findById(adventureId);

        if (!adventure) {
            return currentNode;
        }

        const knowledgeContext =
            await this.container.knowledgeBase.queryAsContext(

                `${adventure.title} ${currentNode.narrative}`,

                { topK: 5, domain: adventure.domain }

            );

        // Part 5 (Emotion Engine): let recent emotional trend shape
        // the next chapter -- purely arithmetic, no LLM call.
        const recentEvents =
            await this.container.adventureEventRepository.findBySessionId(
                input.sessionId
            );

        const emotionalGuidance =
            this.container.emotionTrendService.guidance(
                recentEvents.slice(-3).map(event => event.emotion)
            ).promptNote;

        const expansion =
            await this.container.adventureBlueprintGenerator.expandFrom(

                {

                    adventureId,

                    childName: input.childName,

                    ageRange: input.ageRange,

                    aboutChild: input.aboutChild,

                    moral: adventure.moral,

                    characters: adventure.characters,

                    world: adventure.world,

                    hingeNarrative: currentNode.narrative,

                    relationships,

                    emotionalGuidance

                },

                { knowledgeContext }

            );

        await this.container.storyNodeRepository.saveMany(expansion.nodes);

        const rewrittenCurrentNode: StoryNode = {

            ...currentNode,

            choices: expansion.entryChoices,

            isEnding: false,

            endingType: undefined

        };

        await this.container.storyNodeRepository.updateNode(
            rewrittenCurrentNode
        );

        return rewrittenCurrentNode;

    }

    // Forward BFS from fromNodeId, counting distinct non-ending nodes
    // reached (excluding fromNodeId itself). Correctly accounts for
    // convergent paths -- a graph where many choices loop back
    // together won't look artificially "full" just because it has
    // many edges.
    private countReachableNonEndingNodes(
        nodes: StoryNode[],
        fromNodeId: string
    ): number {

        const byId = new Map(nodes.map(node => [node.id, node]));

        const visited = new Set<string>([fromNodeId]);

        const queue = [fromNodeId];

        while (queue.length > 0) {

            const currentId = queue.shift()!;

            const current = byId.get(currentId);

            if (!current) {
                continue;
            }

            for (const choice of current.choices) {

                if (!visited.has(choice.nextNodeId)) {

                    visited.add(choice.nextNodeId);

                    queue.push(choice.nextNodeId);

                }

            }

        }

        visited.delete(fromNodeId);

        return [...visited]

            .map(id => byId.get(id))

            .filter((node): node is StoryNode => !!node && !node.isEnding)

            .length;

    }

    private dominantEmotion(
        node: StoryNode
    ): string {

        const entries = Object.entries(node.emotion) as [string, number][];

        const dominant = entries.reduce(
            (best, entry) => (entry[1] > best[1] ? entry : best),
            entries[0]
        );

        return dominant[1] > 0 ? dominant[0] : "calm";

    }

}
