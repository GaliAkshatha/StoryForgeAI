import { HybridRetriever } from "../retrieval/HybridRetriever";
import { KnowledgeChunk } from "../models/KnowledgeChunk";
import { RetrievalResult } from "../models/RetrievalResult";

// Facade over the Knowledge domain so consuming agents (Research
// Agent, Story Agent, Consequence Engine) depend on one small
// interface instead of wiring embeddings/vector store/BM25
// themselves. This is the object other packages should import.
export interface KnowledgeRetriever {

    query(
        query: string,
        options?: { topK?: number; domain?: string }
    ): Promise<RetrievalResult[]>;

    queryAsContext(
        query: string,
        options?: { topK?: number; domain?: string }
    ): Promise<string>;

}

export class KnowledgeBase implements KnowledgeRetriever {

    constructor(
        private readonly retriever: HybridRetriever
    ) {}

    async addKnowledge(
        chunks: KnowledgeChunk[]
    ): Promise<void> {

        await this.retriever.ingest(chunks);

    }

    async query(
        query: string,
        options?: { topK?: number; domain?: string }
    ): Promise<RetrievalResult[]> {

        return this.retriever.retrieve(query, options);

    }

    // Convenience for prompt injection: renders top results as a
    // plain-text context block, keeping formatting concerns out of
    // the agents that call this.
    async queryAsContext(
        query: string,
        options?: { topK?: number; domain?: string }
    ): Promise<string> {

        const results = await this.query(query, options);

        if (results.length === 0) {
            return "No grounding knowledge found.";
        }

        return results

            .map((result, index) =>
                `[${index + 1}] (${result.chunk.source}) ${result.chunk.text}`
            )

            .join("\n\n");

    }

}
