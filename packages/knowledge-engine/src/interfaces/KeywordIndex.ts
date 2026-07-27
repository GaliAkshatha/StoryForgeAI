import { KnowledgeChunk } from "../models/KnowledgeChunk";
import { ScoredChunk } from "../models/RetrievalResult";

export interface KeywordIndex {

    index(
        chunks: KnowledgeChunk[]
    ): void;

    search(
        query: string,
        topK: number,
        domain?: string
    ): ScoredChunk[];

}
