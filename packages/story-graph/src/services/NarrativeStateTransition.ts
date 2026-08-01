import {
    NarrativeState,
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

        if (node.eventType === "asked_questions" && !currentProblem) {

            currentProblem = node.narrativeConsequence ?? current.currentProblem;

        }

        if (node.eventType === "solved_puzzle") {

            currentProblem = undefined;

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

            establishedFacts,

            unresolvedThreads,

            recentEventTypes

        };

    }

}
