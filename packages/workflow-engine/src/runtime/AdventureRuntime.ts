import { DependencyContainer } from "../container/DependencyContainer";
import { AgentContextFactory } from "../utils/AgentContextFactory";

import {
    createInitialWorldState,
    DeterministicSimulator,
    WorldState,
    initialChapterState
} from "@storyforge/simulation-engine";

import { StoryNode, ChapterProgressionEngine } from "@storyforge/story-graph";

import { Reflection, LearningAnalytics } from "@storyforge/shared";

import {
    StartAdventureInput,
    StartAdventureOutput,
    AdventureTurnInput,
    AdventureTurnOutput
} from "../models/AdventureTurn";

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

        const { adventure, rootNode: structuralRootNode, narrativeState } = compiled;

        // Correction pass (Section 5): AdventureCompiler now returns
        // structure only -- root's narrative is "" with a
        // pendingRenderRequest attached. This is the SAME call
        // playTurn() makes for every other node; no separate root
        // narration path exists.
        const rootNode =
            await this.container.narrationRenderingService.ensureRendered(
                structuralRootNode
            );

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

            // Section B: chapter progression starts at turn 0,
            // "opening" -- ChapterProgressionEngine's own rule
            // guarantees the opening phase can never immediately end.
            chapterState: initialChapterState(),

            // Phase 2A: the seeded story state, already derived by
            // InitialStoryBuilder from adventure metadata.
            narrativeState,

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
        // Section 3 (correction pass): render narration lazily, only
        // for the node actually reached. A no-op for nodes that
        // already have narrative (the initial blueprint's nodes,
        // untouched this pass) -- only matters for
        // DeterministicExpansionService-produced nodes, which start
        // empty on purpose.
        // ----------------------------------------------------

        nextNode = await this.container.narrationRenderingService.ensureRendered(nextNode);

        // ----------------------------------------------------
        // Deterministic simulation: the same DeterministicSimulator
        // from v2.0, unchanged -- only the source of the effects
        // being applied changed (a pre-generated node instead of a
        // fresh LLM call).
        // ----------------------------------------------------

        const simulation = this.simulator.apply(worldState, nextNode.effects);

        // ----------------------------------------------------
        // Section B/C: advance deterministic chapter progression
        // BEFORE deciding whether to expand or conclude. eventOccurred
        // reuses the SAME signal AdventureEvent logging already uses
        // below (nextNode.eventType) -- no new classification.
        // ----------------------------------------------------

        const advancedChapterState = this.container.chapterProgressionEngine.advance(
            worldState.chapterState ?? initialChapterState(),
            !!nextNode.eventType
        );

        // Phase 2A (Section 9/10): applied ONLY to nextNode -- the
        // node the child actually traversed to. Unvisited sibling
        // choices generated alongside it are never touched, so their
        // semantic content cannot leak into the played NarrativeState.
        const advancedNarrativeState = worldState.narrativeState
            ? this.container.narrativeStateTransition.advancePlotBeat(
                this.container.narrativeStateTransition.apply(worldState.narrativeState, nextNode),
                advancedChapterState.phase
            )
            : worldState.narrativeState;

        let updatedWorldState = {

            ...simulation.state,

            currentNodeId: nextNode.id,

            chapterState: advancedChapterState,

            narrativeState: advancedNarrativeState,

            currentNarrative: nextNode.narrative,

            currentChoices: nextNode.choices.map(choice => ({

                id: choice.id,

                text: choice.text

            }))

        };

        await this.container.worldStateStore.save(updatedWorldState);

        // ----------------------------------------------------
        // Progressive expansion (Section D/E correction pass): a
        // node reached with isEnding=false and zero choices is an
        // unexpanded FRONTIER, not a chapter conclusion -- expand it
        // now, before returning to the child. ChapterProgressionEngine
        // decides whether that expansion produces more frontier or a
        // genuine ending; this runtime never decides eligibility
        // itself, only acts on it.
        // ----------------------------------------------------

        if (!nextNode.isEnding && nextNode.choices.length === 0) {

            const endingEligible = this.container.chapterProgressionEngine.canEnd(
                advancedChapterState
            );

            // Pacing pass (Point 8): a real decision menu appears at
            // the story's actual critical moments (the moral_fork and
            // test plot beats, and the turn a genuine ending becomes
            // possible -- the "Big Choice" before the ending) --
            // otherwise this is a narration beat with a single
            // "Continue" link. Deterministic, no LLM, no change to
            // scoring/constraints/candidate generation.
            const atCriticalBeat =
                advancedNarrativeState?.currentBeatIndex === 2 ||
                advancedNarrativeState?.currentBeatIndex === 3;

            const offerChoice =
                endingEligible ||
                atCriticalBeat ||
                advancedChapterState.turn % 3 === 0;

            nextNode = await this.maybeExpandGraph(
                adventureId,
                nextNode,
                input,
                updatedWorldState,
                endingEligible,
                offerChoice
            );

            updatedWorldState = {

                ...updatedWorldState,

                currentChoices: nextNode.choices.map(choice => ({

                    id: choice.id,

                    text: choice.text

                }))

            };

            await this.container.worldStateStore.save(updatedWorldState);

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

                console.error(
                    "\n===== AdventureRuntime: AnalyticsAgent failed, using deterministic fallback =====\n" +
                    `sessionId: ${input.sessionId}\n` +
                    `error: ${analyticsResult.error}\n` +
                    "===================================================================================\n"
                );

                // Stabilization pass (Part 8/9): never let an LLM
                // explanation-writer's failure break the chapter's
                // conclusion. skillSignals were already computed
                // deterministically above (DeterministicAnalyticsEngine,
                // zero LLM calls) -- only the plain-language summary
                // sentence is missing, so a plain deterministic
                // sentence takes its place instead of crashing.
                analytics = {

                    sessionId: input.sessionId,

                    childId: input.childId,

                    skillSignals,

                    behaviorNotes,

                    summary: skillSignals.length > 0
                        ? `Showed ${skillSignals.map(signal => signal.skill).join(", ")} during this chapter.`
                        : "Explored and made choices during this chapter.",

                    generatedAt: new Date().toISOString()

                };

            }
            else {

                analytics = analyticsResult.output!;

            }

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

                console.error(
                    "\n===== AdventureRuntime: ReflectionAgent failed, using deterministic fallback =====\n" +
                    `sessionId: ${input.sessionId}\n` +
                    `error: ${reflectionResult.error}\n` +
                    "====================================================================================\n"
                );

                reflection = {

                    question: "What do you think happens next?",

                    followUpQuestions: ["Why do you think that?"],

                    observedThemes: [],

                    encouragement: "Every choice you made today was worth thinking about."

                };

            }
            else {

                reflection = reflectionResult.output!;

            }

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
        worldState: WorldState,
        endingEligible: boolean,
        offerChoice: boolean
    ): Promise<StoryNode> {

        // Section D/E correction pass: expand precisely when this
        // node is a genuinely unexpanded frontier (isEnding=false,
        // zero choices) -- not a proactive "running low ahead"
        // heuristic. That heuristic was designed for the old
        // pre-built-blueprint model (variable depth already on disk)
        // and would redundantly re-expand an already-expanded
        // non-ending node under the current one-layer-at-a-time
        // model, discarding real choices the child hasn't picked
        // from yet.
        if (currentNode.isEnding || currentNode.choices.length > 0) {
            return currentNode;
        }

        const adventure =
            await this.container.adventureRepository.findById(adventureId);

        if (!adventure) {
            return currentNode;
        }

        // Part 5 (Emotion Engine): let recent emotional trend shape
        // the next chapter -- purely arithmetic, no LLM call.
        const recentEvents =
            await this.container.adventureEventRepository.findBySessionId(
                input.sessionId
            );

        const emotionGuidance =
            this.container.emotionTrendService.guidance(
                recentEvents.slice(-3).map(event => event.emotion)
            );

        // Phases B-M: this is the deterministic replacement for
        // AdventureBlueprintGenerator.expandFrom() -- candidate
        // generation, constraint filtering, and scoring are all
        // computed here with no LLM call -- and (correction pass,
        // Section 3) narration is no longer rendered here at all;
        // nodes come back with structure only, narrated lazily on
        // actual arrival (see NarrationRenderingService, called from
        // playTurn below).
        const expansion =
            await this.container.deterministicExpansionService.expand({

                adventureId,

                worldState,

                characters: adventure.characters,

                actorName: input.childName,

                ageRange: input.ageRange,

                aboutChild: input.aboutChild,

                domain: adventure.domain,

                skillFocus: adventure.learningPlan.map(entry => entry.skillFocus),

                recentEventTypes: recentEvents.map(event => event.eventType),

                recentEvents,

                emotionGuidance,

                turn: worldState.turn,

                endingEligible,

                offerChoice,

                // Phase 2A: falls back to a minimal default only for
                // legacy WorldState records that predate this field
                // (Section 3 backward-compatibility case) -- every
                // NEW adventure has this seeded at startAdventure().
                narrativeState: worldState.narrativeState ?? {

                    location: worldState.location,

                    activeCharacterIds: [],

                    currentGoal: "continue the adventure",

                    establishedFacts: [],

                    unresolvedThreads: [],

                    recentEventTypes: []

                },

                nodeIdPrefix: `ch-${crypto.randomUUID().slice(0, 8)}`

            });

        // Section 1: zero valid candidates is a safe no-op, not an
        // error -- leave currentNode exactly as it was rather than
        // grafting on an empty/invalid choice set.
        if (expansion.nodes.length === 0) {
            return currentNode;
        }

        await this.container.storyNodeRepository.saveMany(expansion.nodes);

        const rewrittenCurrentNode: StoryNode = {

            ...currentNode,

            choices: expansion.entryChoices,

            // currentNode ITSELF never becomes an ending -- only its
            // newly-created CHILDREN can be (expansion.nodes, marked
            // isEnding per endingEligible above). Reaching a genuine
            // ending is a separate, later turn's traversal.
            isEnding: false,

            endingType: undefined

        };

        await this.container.storyNodeRepository.updateNode(
            rewrittenCurrentNode
        );

        return rewrittenCurrentNode;

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
