import { AdventureEventType } from "@storyforge/shared";

// Phase 2A: the minimum persistent narrative state needed for
// deterministic expansion to know WHAT IS CURRENTLY HAPPENING IN THE
// STORY, distinct from WorldState's existing mechanical fields
// (inventory/relationships/quests/flags) which already exist and are
// reused, not duplicated, wherever they already cover a continuity
// need (e.g. boolean gates like "was there a failed attempt" live in
// WorldState.flags via the existing flag_true/flag_false
// prerequisite types -- no new mechanism was invented for those).
//
// Bounds are deliberate: this must never grow unboundedly across a
// long chapter. establishedFacts/unresolvedThreads/recentEventTypes
// are all capped and drop the oldest entry once full -- "recent and
// relevant," not "the complete transcript" (that's what
// AdventureEventRepository is for).
export interface NarrativeState {

    location: string;

    // Characters actually established/present in the scene so far --
    // NOT "every character that exists in this adventure's metadata."
    // This is the character-continuity gate: only characters in this
    // list can be selected as a candidate's target (see
    // ConstraintEngine's npc_present + CandidateEventGenerator's
    // target selection).
    activeCharacterIds: string[];

    // What the characters are currently trying to accomplish.
    // Derived once from adventure metadata (see InitialStoryBuilder)
    // and only changes when a semantic event explicitly changes it.
    currentGoal: string;

    // A concrete obstacle currently established in the story, if any.
    // Required before helped_npc/solved_puzzle/failed_puzzle can be
    // offered (see ConstraintEngine's problem_established check) --
    // without this, "helps Professor Hoot" or "solves it" refers to
    // nothing.
    currentProblem?: string;

    // Bounded to 8 -- enough for SemanticEventBuilder to reference
    // recent facts without WorldState growing across a long chapter.
    establishedFacts: string[];

    // Bounded to 5 -- open narrative questions the story hasn't
    // resolved yet.
    unresolvedThreads: string[];

    // Bounded to 5 -- the eventType of the last few PLAYED (not
    // generated) turns. Distinct from ConstraintEngine's existing
    // recentEventTypes cooldown input (which is derived from
    // AdventureEventRepository) -- this one lives on NarrativeState
    // itself so it round-trips with everything else in one place and
    // stays available even before an AdventureEvent has been
    // persisted for the current turn.
    recentEventTypes: AdventureEventType[];

}

export const ESTABLISHED_FACTS_LIMIT = 8;

export const UNRESOLVED_THREADS_LIMIT = 5;

export const RECENT_EVENT_TYPES_LIMIT = 5;

export function boundedPush<T>(
    list: T[],
    item: T,
    limit: number
): T[] {

    return [...list, item].slice(-limit);

}
