import {
    NarrativeState,
    ChapterPhase,
    PlotBeatType,
    ESTABLISHED_FACTS_LIMIT,
    UNRESOLVED_THREADS_LIMIT,
    RECENT_EVENT_TYPES_LIMIT,
    boundedPush
} from "@storyforge/simulation-engine";

import { StoryNode } from "../models/StoryNode";

// Phase 2A (Section 9/10): the ONLY function allowed to change
// NarrativeState. Deterministic, no LLM, no randomness. Critically,
// this is called ONLY from AdventureRuntime, ONLY for the node the
// child actually traversed to -- never for the sibling choices that
// were generated alongside it but not picked. A node existing in the
// persisted graph is not the same as it having been PLAYED.
export class NarrativeStateTransition {

    apply(
        current: NarrativeState,
        node: StoryNode
    ): NarrativeState {

        if (!node.eventType) {

            return current;

        }

        // Phase 2B fix (Section B): targeting a character must NOT
        // implicitly introduce them. Under Phase 2A's own
        // CandidateEventGenerator, a target is always already drawn
        // from activeCharacterIds, so this line was redundant in the
        // current wiring -- but it was still the WRONG mechanism: it
        // derived activation from incidental targeting rather than
        // explicit semantic meaning, which would silently misbehave
        // for any future/alternate code path that builds a StoryNode
        // differently. Activation now derives ONLY from an explicit
        // characterIntroduced signal on the node.
        let activeCharacterIds = current.activeCharacterIds;

        if (node.characterIntroducedId && !activeCharacterIds.includes(node.characterIntroducedId)) {

            activeCharacterIds = [...activeCharacterIds, node.characterIntroducedId];

        }

        let currentProblem = current.currentProblem;

        let activeProblem = current.activeProblem;

        if (node.eventType === "asked_questions" && !currentProblem) {

            currentProblem = node.narrativeConsequence ?? current.currentProblem;

        }

        if (node.eventType === "solved_puzzle") {

            currentProblem = undefined;

            if (activeProblem) {

                activeProblem = { ...activeProblem, status: "resolved" };

            }

        }

        const establishedFacts = node.narrativeConsequence
            ? boundedPush(current.establishedFacts, node.narrativeConsequence, ESTABLISHED_FACTS_LIMIT)
            : current.establishedFacts;

        let unresolvedThreads = current.unresolvedThreads;

        if (node.threadResolved) {

            unresolvedThreads = unresolvedThreads.filter(thread => thread !== node.threadResolved);

        }

        if (node.threadIntroduced) {

            unresolvedThreads = boundedPush(unresolvedThreads, node.threadIntroduced, UNRESOLVED_THREADS_LIMIT);

        }

        const recentEventTypes = boundedPush(
            current.recentEventTypes,
            node.eventType,
            RECENT_EVENT_TYPES_LIMIT
        );

        return {

            ...current,

            activeCharacterIds,

            currentProblem,

            activeProblem,

            establishedFacts,

            unresolvedThreads,

            recentEventTypes

        };

    }

    // Story arc pass: moves the story into its NEXT authored beat
    // once the chapter phase has progressed past the current beat's
    // stage. This is what keeps the middle/late chapter tied to an
    // actual plot (the moral fork, the twist that tests it) instead
    // of the problem staying frozen at whatever the opening
    // established. Deterministic -- purely a phase->beat lookup, no
    // LLM involved.
    private static readonly PHASE_FOR_BEAT: Record<PlotBeatType, ChapterPhase> = {

        hook: "opening",

        complication: "development",

        moral_fork: "challenge",

        test: "climax",

        resolution: "resolution"

    };

    advancePlotBeat(
        current: NarrativeState,
        phase: ChapterPhase
    ): NarrativeState {

        if (!current.plotOutline || current.plotOutline.length === 0) {
            return current;
        }

        const currentIndex = current.currentBeatIndex ?? 0;

        // Find the furthest beat whose mapped phase has already been
        // reached -- never regresses, and skips ahead cleanly if a
        // phase transition was crossed in one turn.
        let targetIndex = currentIndex;

        for (let i = current.plotOutline.length - 1; i >= currentIndex; i--) {

            if (this.phaseReached(phase, NarrativeStateTransition.PHASE_FOR_BEAT[current.plotOutline[i].beat])) {

                targetIndex = i;

                break;

            }

        }

        if (targetIndex === currentIndex) {
            return current;
        }

        const newBeat = current.plotOutline[targetIndex];

        return {

            ...current,

            currentBeatIndex: targetIndex,

            currentProblem: newBeat.summary,

            activeProblem: {

                id: `problem-beat-${targetIndex}`,

                type: newBeat.beat,

                participants: current.activeCharacterIds,

                reason: newBeat.summary,

                goal: current.currentGoal,

                location: current.location,

                status: "active",

                difficulty: 1

            },

            establishedFacts: boundedPush(current.establishedFacts, newBeat.summary, ESTABLISHED_FACTS_LIMIT)

        };

    }

    private static readonly PHASE_ORDER: ChapterPhase[] = [
        "opening", "exploration", "development", "challenge", "climax", "resolution"
    ];

    private phaseReached(
        actualPhase: ChapterPhase,
        requiredPhase: ChapterPhase
    ): boolean {

        return NarrativeStateTransition.PHASE_ORDER.indexOf(actualPhase) >=
               NarrativeStateTransition.PHASE_ORDER.indexOf(requiredPhase);

    }

}
