import { KnowledgeChunk } from "../models/KnowledgeChunk";
import { ScoredChunk } from "../models/RetrievalResult";

export interface VectorRecord {

    id: string;

    embedding: number[];

    chunk: KnowledgeChunk;

}

export interface VectorStore {

    upsert(
        records: VectorRecord[]
    ): Promise<void>;

    query(
        embedding: number[],
        topK: number,
        domain?: string
    ): Promise<ScoredChunk[]>;

}
