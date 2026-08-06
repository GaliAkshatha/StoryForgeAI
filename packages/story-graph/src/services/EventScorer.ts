import { AdventureEventType } from "@storyforge/shared";
import { PlotBeatType } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";
import { AdventureEvent } from "../models/AdventureEvent";
import { EmotionGuidance } from "./EmotionTrendService";
import { SeededRandom } from "./SeededRandom";

export interface EventScoringWeights {

    learningRelevance: number;

    novelty: number;

    emotionalRelevance: number;

    difficultyMatch: number;

    // Correction pass (Section 4): memory-driven continuity --
    // "does this event continue a thread from a relevant past
    // memory" -- as its own explicit component.
    continuity: number;

    // Story-structure pass: "does this event actually enact the
    // current plot beat" -- e.g. at the moral_fork beat, a
    // character-interaction event (helped_npc/asked_questions) is
    // what the beat calls for, not a generic explored/observed pick.
    // Before this existed, plotOutline only ever changed DISPLAY
    // text (NarrativeState.currentProblem) -- it had zero influence
    // on which of the ~10 generic event types actually got selected,
    // which is why the plot arc read as decoration rather than
    // structure.
    beatAlignment: number;

    // "Deck of cards" mechanic (Kreminski's storylet-design survey,
    // via Fallen London/StoryNexus): a storylet highly relevant to
    // current state should be noticeably more likely to surface, not
    // merely eligible-or-not. Concretely: when NarrativeState has an
    // open unresolved thread (e.g. "an unfinished attempt at moving
    // the branch"), the event type that would actually engage that
    // thread (retried, solved_puzzle) scores higher here -- so an
    // open thread pulls focus back to itself soon, instead of being
    // just as likely to get buried as it was to surface in the
    // first place.
    threadRelevance: number;

    repetitionPenalty: number;

    randomness: number;

}

// Correction pass: rebalanced to make room for `continuity` without
// the formula becoming arbitrary -- the five previously-positive
// weights still sum to 1.0.
//
// OLD (pre-correction-pass): learningRelevance 0.35, novelty 0.20,
//   emotionalRelevance 0.20, difficultyMatch 0.15, randomness 0.10
//   (sum 1.00; repetitionPenalty 0.25 subtracted separately)
//
// NEW: learningRelevance 0.30 (-0.05), novelty 0.20 (unchanged),
//   emotionalRelevance 0.15 (-0.05), difficultyMatch 0.15
//   (unchanged), continuity 0.15 (new), randomness 0.05 (-0.05)
//   (sum 1.00; repetitionPenalty 0.25 unchanged, still subtracted
//   separately). The 0.15 given to continuity was taken from
//   learningRelevance, emotionalRelevance, and randomness -- not
//   invented from nothing.
// Story-structure pass: added beatAlignment (0.10), taken from
// novelty (0.20 -> 0.15) and randomness (0.05 -> 0). The five
// positive weights (learningRelevance/novelty/emotionalRelevance/
// difficultyMatch/continuity/beatAlignment) still sum to 1.0.
// Story-structure pass, continued: added threadRelevance (0.08),
// taken from emotionalRelevance (0.15 -> 0.10) and difficultyMatch
// (0.15 -> 0.12). All six positive weights still sum to 1.0.
export const DEFAULT_SCORING_WEIGHTS: EventScoringWeights = {

    learningRelevance: 0.30,

    novelty: 0.15,

    emotionalRelevance: 0.10,

    difficultyMatch: 0.12,

    continuity: 0.15,

    beatAlignment: 0.10,

    threadRelevance: 0.08,

    repetitionPenalty: 0.25,

    randomness: 0

};

export interface ScoreComponents {

    learningRelevance: number;

    novelty: number;

    emotionalRelevance: number;

    difficultyMatch: number;

    continuity: number;

    beatAlignment: number;

    threadRelevance: number;

    repetitionPenalty: number;

    randomness: number;

}

export interface ScoredCandidate {

    event: CandidateEvent;

    totalScore: number;

    // Phase D: "the engine should be able to explain/debug why an
    // event won" -- this is that explanation, always computed, not
    // just in a special debug mode.
    components: ScoreComponents;

}

export interface EventScoringContext {

    skillFocus: string[];

    recentEventTypes: AdventureEventType[];

    emotionGuidance: EmotionGuidance;

    // Correction pass (Section 4): already-retrieved, already-scored
    // memories (MemoryRetrievalService's output) -- EventScorer never
    // queries memory itself, it only reads what it's given. Memory
    // enrichment happens strictly AFTER hard constraints and BEFORE
    // scoring, per the required ordering; it can never resurrect a
    // candidate the ConstraintEngine already rejected, because by
    // the time scoring runs, invalid candidates were never in the
    // list to begin with (see DeterministicExpansionService).
    relevantMemories: AdventureEvent[];

    // Story-structure pass: which plot beat is currently active
    // (from NarrativeState.plotOutline[currentBeatIndex].beat), if
    // any -- undefined for adventures/turns with no plot outline
    // (legacy data, or the opening before any beat is set).
    currentPlotBeat?: PlotBeatType;

    // "Deck of cards" mechanic input -- NarrativeState.unresolvedThreads
    // as-is. Presence alone (not matching a specific thread's exact
    // content, which would be fragile NLP) drives threadRelevance:
    // is there ANY open thread right now, and does this candidate's
    // type belong to the small set that tends to engage one.
    unresolvedThreads?: string[];

    // Same seed -> same scores -> same selection, every time (Phase
    // P's reproducibility requirement). Typically derived from
    // `${worldId}:${turn}` via SeededRandom.seedFromString.
    seed: number;

}

// Event types that represent a positive relational interaction --
// used by the continuity component to recognize "this continues an
// established positive thread with the same character" vs. a
// neutral/negative one. Small, explicit, reviewable -- same spirit
// as DeterministicAnalyticsEngine's weight table.
const POSITIVE_RELATIONAL_TYPES: AdventureEventType[] = [
    "helped_npc", "shared_resources", "led_team"
];

// Story-structure pass: which generic event types actually enact
// each plot beat. Small, explicit, reviewable -- same spirit as
// POSITIVE_RELATIONAL_TYPES above. This is what makes the plot
// outline a real constraint on gameplay instead of decorative text:
// at the moral_fork beat, a character-interaction event scores
// higher than a generic look-around, because the moral fork IS a
// decision made in relation to someone/something, not idle
// exploration.
const BEAT_ALIGNED_TYPES: Record<PlotBeatType, AdventureEventType[]> = {

    hook: ["observed", "explored", "asked_questions"],

    complication: ["failed_puzzle", "explored", "ignored_warning"],

    moral_fork: ["helped_npc", "asked_questions", "shared_resources"],

    test: ["retried", "solved_puzzle", "led_team"],

    resolution: ["solved_puzzle", "shared_resources", "led_team"]

};

// "Deck of cards" mechanic: which event types tend to actually
// ENGAGE an open thread rather than leave it sitting unresolved --
// retried directly follows up on "an unfinished attempt at X"
// (ConstraintEngine already gates it on the hasFailedAttempt flag);
// solved_puzzle/asked_questions are the natural ways a noticed
// detail ("a detail noticed while looking into X", "a caution
// noticed while exploring X") gets followed up on. Small, explicit,
// reviewable -- same spirit as BEAT_ALIGNED_TYPES above.
const THREAD_RESOLVING_TYPES: AdventureEventType[] = [
    "retried", "solved_puzzle", "asked_questions"
];

export class EventScorer {

    constructor(
        private readonly weights: EventScoringWeights = DEFAULT_SCORING_WEIGHTS
    ) {}

    score(
        candidates: CandidateEvent[],
        context: EventScoringContext
    ): ScoredCandidate[] {

        const rng = new SeededRandom(context.seed);

        return candidates

            .map(event => this.scoreOne(event, context, rng))

            .sort((a, b) => b.totalScore - a.totalScore);

    }

    selectTop(
        candidates: CandidateEvent[],
        context: EventScoringContext,
        count: number
    ): ScoredCandidate[] {

        return this.score(candidates, context).slice(0, count);

    }

    private scoreOne(
        event: CandidateEvent,
        context: EventScoringContext,
        rng: SeededRandom
    ): ScoredCandidate {

        const recentOfType = context.recentEventTypes.filter(type => type === event.type).length;

        const recentTotal = Math.max(context.recentEventTypes.length, 1);

        const learningRelevance = event.learningTags.some(
            tag => context.skillFocus.some(
                skill => skill.toLowerCase().includes(tag.toLowerCase()) ||
                         tag.toLowerCase().includes(skill.toLowerCase())
            )
        ) ? 1 : 0.3;

        const novelty = 1 - (recentOfType / recentTotal);

        const emotionalRelevance = context.emotionGuidance.shouldIncreaseEncouragement
            ? ((event.emotionalEffects.pride ?? 0) > 0 || (event.emotionalEffects.confidence ?? 0) > 0 ? 1 : 0.4)
            : 0.6;

        const difficultyMatch = context.emotionGuidance.shouldReduceDifficulty
            ? (event.complexity === "trivial" ? 1 : 0.2)
            : 0.7;

        const continuity = this.scoreContinuity(event, context.relevantMemories);

        const beatAlignment = context.currentPlotBeat
            ? (BEAT_ALIGNED_TYPES[context.currentPlotBeat].includes(event.type) ? 1 : 0.3)
            : 0.5;

        // Deck of cards: an open thread makes the type that would
        // engage it noticeably more likely to be dealt -- but ONLY
        // when a thread actually exists. No open thread -> neutral,
        // never a bonus for "the right type" in the abstract.
        const hasOpenThread = (context.unresolvedThreads ?? []).length > 0;

        const threadRelevance = hasOpenThread
            ? (THREAD_RESOLVING_TYPES.includes(event.type) ? 1 : 0.4)
            : 0.5;

        const repetitionPenalty = recentOfType / recentTotal;

        const randomness = rng.next();

        const components: ScoreComponents = {
            learningRelevance,
            novelty,
            emotionalRelevance,
            difficultyMatch,
            continuity,
            beatAlignment,
            threadRelevance,
            repetitionPenalty,
            randomness
        };

        const totalScore =
            this.weights.learningRelevance * learningRelevance +
            this.weights.novelty * novelty +
            this.weights.emotionalRelevance * emotionalRelevance +
            this.weights.difficultyMatch * difficultyMatch +
            this.weights.continuity * continuity +
            this.weights.beatAlignment * beatAlignment +
            this.weights.threadRelevance * threadRelevance -
            this.weights.repetitionPenalty * repetitionPenalty +
            this.weights.randomness * randomness;

        return { event, totalScore, components };

    }

    // continuity(event, relevantMemories) -> [0, 1].
    //
    // - No target on this candidate at all -> 0.5 (neutral: there's
    //   no relational thread for this event to continue or break).
    // - Target exists but no memories reference that SAME character
    //   -> 0.4 (slightly below neutral: a fresh interaction, not
    //   continuing anything established).
    // - Target exists and at least one memory references that same
    //   character, and that memory was a positive relational type
    //   (POSITIVE_RELATIONAL_TYPES) -> 1 (a clear continuation of an
    //   established positive thread -- "child helped Luna" ->
    //   "Luna trusts child with a task").
    // - Target exists, memory references the same character, but
    //   none of those were positive-relational -> 0.6 (there IS a
    //   history with this character, just not one that strongly
    //   predicts this specific continuation).
    private scoreContinuity(
        event: CandidateEvent,
        relevantMemories: AdventureEvent[]
    ): number {

        if (!event.targetId) {
            return 0.5;
        }

        const sameCharacterMemories = relevantMemories.filter(
            memory => memory.characterId === event.targetId
        );

        if (sameCharacterMemories.length === 0) {
            return 0.4;
        }

        const hasPositiveThread = sameCharacterMemories.some(
            memory => POSITIVE_RELATIONAL_TYPES.includes(memory.eventType)
        );

        return hasPositiveThread ? 1 : 0.6;

    }

}
