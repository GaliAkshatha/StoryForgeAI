import { VectorStore, VectorRecord } from "../interfaces/VectorStore";
import { ScoredChunk } from "../models/RetrievalResult";

// Cosine-similarity vector store held in process memory. Useful for
// local development, unit tests, and any deployment that hasn't
// stood up a ChromaDB instance yet. Implements the same VectorStore
// contract as ChromaVectorStore so callers (HybridRetriever) never
// know which one they're talking to -- classic DI substitution.
export class InMemoryVectorStore implements VectorStore {

    private readonly records: VectorRecord[] = [];

    async upsert(
        records: VectorRecord[]
    ): Promise<void> {

        for (const record of records) {

            const existingIndex = this.records.findIndex(
                r => r.id === record.id
            );

            if (existingIndex >= 0) {
                this.records[existingIndex] = record;
            }
            else {
                this.records.push(record);
            }

        }

    }

    async query(
        embedding: number[],
        topK: number,
        domain?: string
    ): Promise<ScoredChunk[]> {

        const candidates = domain
            ? this.records.filter(r => r.chunk.domain === domain)
            : this.records;

        return candidates

            .map(record => ({
                chunk: record.chunk,
                score: cosineSimilarity(embedding, record.embedding)
            }))

            .sort((a, b) => b.score - a.score)

            .slice(0, topK);

    }

}

function cosineSimilarity(a: number[], b: number[]): number {

    if (a.length !== b.length || a.length === 0) {
        return 0;
    }

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) {
        return 0;
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));

}
