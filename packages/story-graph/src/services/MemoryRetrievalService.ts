import { AdventureEvent } from "../models/AdventureEvent";

export interface MemoryRetrievalOptions {

    limit: number;

    relevantTags?: string[];

}

const RECENCY_WEIGHT = 0.4;

const IMPORTANCE_WEIGHT = 0.4;

const RELEVANCE_WEIGHT = 0.2;

// The importance of each event type -- how much it's "worth
// remembering." Hand-authored, reviewable, matches the same spirit
// as DeterministicAnalyticsEngine's weight table (a small, explicit,
// editable table rather than a black box).
const IMPORTANCE_BY_TYPE: Record<string, number> = {

    helped_npc: 0.9,

    led_team: 0.9,

    solved_puzzle: 0.8,

    shared_resources: 0.7,

    ignored_warning: 0.6,

    failed_puzzle: 0.4,

    retried: 0.4,

    asked_questions: 0.3,

    explored: 0.2,

    observed: 0.2

};

// Phase H: "Use structured story memory rather than sending complete
// narration history to Gemini... retrieval should use computational
// factors such as relevance, recency, importance." Pure function
// over already-persisted AdventureEvents -- no LLM, no embeddings,
// no vector search; a simple, explainable weighted score is
// sufficient at this scale and keeps this trivially testable.
export class MemoryRetrievalService {

    retrieve(
        events: AdventureEvent[],
        options: MemoryRetrievalOptions
    ): AdventureEvent[] {

        if (events.length === 0) {
            return [];
        }

        const scored = events.map((event, index) => ({

            event,

            score: this.score(event, index, events.length, options)

        }));

        return scored

            .sort((a, b) => b.score - a.score)

            .slice(0, options.limit)

            .map(entry => entry.event);

    }

    private score(
        event: AdventureEvent,
        index: number,
        total: number,
        options: MemoryRetrievalOptions
    ): number {

        const recency = total > 1 ? index / (total - 1) : 1;

        const importance = IMPORTANCE_BY_TYPE[event.eventType] ?? 0.5;

        const relevance = options.relevantTags?.some(
            tag => event.eventType.includes(tag) || tag.includes(event.eventType)
        ) ? 1 : 0.3;

        return (RECENCY_WEIGHT * recency) +
               (IMPORTANCE_WEIGHT * importance) +
               (RELEVANCE_WEIGHT * relevance);

    }

}
