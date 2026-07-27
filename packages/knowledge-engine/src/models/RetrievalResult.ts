import { KnowledgeChunk } from "./KnowledgeChunk";

export type RetrievalSource = "vector" | "keyword";

export interface ScoredChunk {

    chunk: KnowledgeChunk;

    score: number;

}

export interface RetrievalResult {

    chunk: KnowledgeChunk;

    // Final fused score (Reciprocal Rank Fusion score).
    score: number;

    // Which underlying retrievers surfaced this chunk.
    matchedBy: RetrievalSource[];

}
