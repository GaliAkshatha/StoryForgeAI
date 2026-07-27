import { EmbeddingClient } from "../interfaces/EmbeddingClient";
import { VectorStore, VectorRecord } from "../interfaces/VectorStore";
import { KeywordIndex } from "../interfaces/KeywordIndex";
import { KnowledgeChunk } from "../models/KnowledgeChunk";
import { RetrievalResult } from "../models/RetrievalResult";
import { ReciprocalRankFusion } from "./ReciprocalRankFusion";

export interface HybridRetrieverDependencies {

    embeddingClient: EmbeddingClient;

    vectorStore: VectorStore;

    keywordIndex: KeywordIndex;

    fusion?: ReciprocalRankFusion;

}

// The retrieval half of the Hybrid RAG pipeline described in the
// Core Loop: "Hybrid RAG retrieves knowledge" between the
// Consequence Engine updating World State and the LLM reasoning
// on it. Combines dense (vector/nomic-embed-text via Ollama +
// ChromaDB) and sparse (BM25) retrieval via Reciprocal Rank Fusion.
export class HybridRetriever {

    private readonly fusion: ReciprocalRankFusion;

    constructor(
        private readonly deps: HybridRetrieverDependencies
    ) {

        this.fusion = deps.fusion ?? new ReciprocalRankFusion();

    }

    async ingest(
        chunks: KnowledgeChunk[]
    ): Promise<void> {

        if (chunks.length === 0) {
            return;
        }

        const embeddings = await this.deps.embeddingClient.embedBatch(
            chunks.map(chunk => chunk.text)
        );

        const records: VectorRecord[] = chunks.map((chunk, index) => ({

            id: chunk.id,

            embedding: embeddings[index],

            chunk

        }));

        await this.deps.vectorStore.upsert(records);

        this.deps.keywordIndex.index(chunks);

    }

    async retrieve(
        query: string,
        options?: { topK?: number; domain?: string; candidateK?: number }
    ): Promise<RetrievalResult[]> {

        const topK = options?.topK ?? 5;

        const candidateK = options?.candidateK ?? Math.max(topK * 4, 10);

        const queryEmbedding =
            await this.deps.embeddingClient.embed(query);

        const vectorResults = await this.deps.vectorStore.query(
            queryEmbedding,
            candidateK,
            options?.domain
        );

        const keywordResults = this.deps.keywordIndex.search(
            query,
            candidateK,
            options?.domain
        );

        return this.fusion.fuse(
            [
                { source: "vector", results: vectorResults },
                { source: "keyword", results: keywordResults }
            ],
            topK
        );

    }

}
