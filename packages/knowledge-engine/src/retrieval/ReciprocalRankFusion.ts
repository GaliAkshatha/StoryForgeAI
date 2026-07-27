import { ScoredChunk } from "../models/RetrievalResult";
import {
    RetrievalResult,
    RetrievalSource
} from "../models/RetrievalResult";

// Fuses multiple ranked result lists (e.g. vector search + BM25)
// into a single ranking using Reciprocal Rank Fusion:
//
//     RRF(d) = sum over each ranked list containing d of 1 / (k + rank(d))
//
// RRF is used because it combines rankings without needing the raw
// scores from each retriever to be on comparable scales (cosine
// similarity vs. BM25 scores are not directly comparable).
export class ReciprocalRankFusion {

    constructor(
        private readonly k: number = 60
    ) {}

    fuse(
        rankedLists: { source: RetrievalSource; results: ScoredChunk[] }[],
        topK: number
    ): RetrievalResult[] {

        const fused = new Map<string, {
            score: number;
            chunk: ScoredChunk["chunk"];
            matchedBy: Set<RetrievalSource>;
        }>();

        for (const { source, results } of rankedLists) {

            results.forEach((result, index) => {

                const rank = index + 1;

                const rrfScore = 1 / (this.k + rank);

                const existing = fused.get(result.chunk.id);

                if (existing) {

                    existing.score += rrfScore;

                    existing.matchedBy.add(source);

                }
                else {

                    fused.set(result.chunk.id, {

                        score: rrfScore,

                        chunk: result.chunk,

                        matchedBy: new Set([source])

                    });

                }

            });

        }

        return [...fused.values()]

            .sort((a, b) => b.score - a.score)

            .slice(0, topK)

            .map(entry => ({

                chunk: entry.chunk,

                score: entry.score,

                matchedBy: [...entry.matchedBy]

            }));

    }

}
