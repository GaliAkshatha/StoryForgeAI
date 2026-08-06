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
export type StoryProblemStatus = "active" | "resolved";

// The structured replacement for treating "the problem" as a raw
// string. Every field here is authored/derived in a controlled way
// (never raw LLM prose), so concatenating them into choice/narration
// text can never leak a character bio or a broken sentence fragment
// -- which is exactly the bug class that kept recurring under the
// string-based design.
export interface StoryProblem {

    id: string;

    // A short label for analytics/logging, not shown to the player.
    type: string;

    // Character IDs involved -- NOT names, so this stays stable even
    // if a character's display name changes.
    participants: string[];

    // Short controlled phrase (a handful of words), e.g. "a fallen
    // branch blocks the path" -- authored to be interpolation-safe,
    // never a full sentence copied from premise/description text.
    reason: string;

    // What resolving it looks like, e.g. "clear the path".
    goal: string;

    location: string;

    status: StoryProblemStatus;

    difficulty: number;

}

export type PlotBeatType = "hook" | "complication" | "moral_fork" | "test" | "resolution";

export interface PlotBeat {

    beat: PlotBeatType;

    summary: string;

}

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
    // Structured problem representation -- the source of truth.
    // currentProblem (string) below is now DERIVED from this for
    // backward-compatible display/logging only; nothing should build
    // player-facing text by concatenating raw strings anymore.
    activeProblem?: StoryProblem;

    // @deprecated derived display string -- kept for backward
    // compatibility with existing persisted records and any code not
    // yet migrated to activeProblem. Never interpolate this directly
    // into choice text; use activeProblem's structured fields.
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

    // Story arc pass: the authored plot (from Adventure.plotOutline)
    // and which beat is currently active. Advances alongside
    // ChapterProgressionEngine's phase (see AdventureRuntime) --
    // this is what keeps the middle/late chapter tied to an actual
    // arc instead of freezing at the opening's initial problem.
    plotOutline?: PlotBeat[];

    currentBeatIndex?: number;

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
