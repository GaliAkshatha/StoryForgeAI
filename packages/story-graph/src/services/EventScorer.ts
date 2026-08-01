import { AdventureEventType } from "@storyforge/shared";
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
export const DEFAULT_SCORING_WEIGHTS: EventScoringWeights = {

    learningRelevance: 0.30,

    novelty: 0.20,

    emotionalRelevance: 0.15,

    difficultyMatch: 0.15,

    continuity: 0.15,

    repetitionPenalty: 0.25,

    randomness: 0.05

};

export interface ScoreComponents {

    learningRelevance: number;

    novelty: number;

    emotionalRelevance: number;

    difficultyMatch: number;

    continuity: number;

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

        const repetitionPenalty = recentOfType / recentTotal;

        const randomness = rng.next();

        const components: ScoreComponents = {
            learningRelevance,
            novelty,
            emotionalRelevance,
            difficultyMatch,
            continuity,
            repetitionPenalty,
            randomness
        };

        const totalScore =
            this.weights.learningRelevance * learningRelevance +
            this.weights.novelty * novelty +
            this.weights.emotionalRelevance * emotionalRelevance +
            this.weights.difficultyMatch * difficultyMatch +
            this.weights.continuity * continuity -
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
