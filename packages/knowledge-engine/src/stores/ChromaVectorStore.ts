import { VectorStore, VectorRecord } from "../interfaces/VectorStore";
import { ScoredChunk } from "../models/RetrievalResult";
import { KnowledgeChunk } from "../models/KnowledgeChunk";

export interface ChromaVectorStoreConfig {

    baseUrl: string;

    collection: string;

}

// Thin REST client for ChromaDB. Embeddings are computed upstream by
// OllamaEmbeddingClient (nomic-embed-text) -- Chroma is used purely
// as the vector index, not as an embedding provider, which keeps the
// "AI Stack" boundary explicit: Ollama embeds, Chroma stores/queries.
export class ChromaVectorStore implements VectorStore {

    private collectionId: string | undefined;

    constructor(
        private readonly config: ChromaVectorStoreConfig
    ) {}

    private async resolveCollectionId(): Promise<string> {

        if (this.collectionId) {
            return this.collectionId;
        }

        const getOrCreate = await fetch(

            `${this.config.baseUrl}/api/v1/collections`,

            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    name: this.config.collection,

                    get_or_create: true

                })

            }

        );

        if (!getOrCreate.ok) {

            throw new Error(
                `Chroma get_or_create collection failed: ${getOrCreate.status}`
            );

        }

        const collection = await getOrCreate.json();

        this.collectionId = collection.id;

        return this.collectionId!;

    }

    async upsert(
        records: VectorRecord[]
    ): Promise<void> {

        if (records.length === 0) {
            return;
        }

        const collectionId = await this.resolveCollectionId();

        const response = await fetch(

            `${this.config.baseUrl}/api/v1/collections/${collectionId}/upsert`,

            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    ids: records.map(r => r.id),

                    embeddings: records.map(r => r.embedding),

                    documents: records.map(r => r.chunk.text),

                    metadatas: records.map(r => ({

                        source: r.chunk.source,

                        domain: r.chunk.domain,

                        ...r.chunk.metadata

                    }))

                })

            }

        );

        if (!response.ok) {

            throw new Error(
                `Chroma upsert failed: ${response.status}`
            );

        }

    }

    async query(
        embedding: number[],
        topK: number,
        domain?: string
    ): Promise<ScoredChunk[]> {

        const collectionId = await this.resolveCollectionId();

        const response = await fetch(

            `${this.config.baseUrl}/api/v1/collections/${collectionId}/query`,

            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    query_embeddings: [embedding],

                    n_results: topK,

                    where: domain ? { domain } : undefined,

                    include: ["documents", "metadatas", "distances"]

                })

            }

        );

        if (!response.ok) {

            throw new Error(
                `Chroma query failed: ${response.status}`
            );

        }

        const data = await response.json();

        const ids: string[] = data.ids?.[0] ?? [];

        const documents: string[] = data.documents?.[0] ?? [];

        const metadatas: Record<string, string>[] =
            data.metadatas?.[0] ?? [];

        const distances: number[] = data.distances?.[0] ?? [];

        return ids.map((id, index) => {

            const metadata = metadatas[index] ?? {};

            const chunk: KnowledgeChunk = {

                id,

                text: documents[index],

                source: metadata.source ?? "unknown",

                domain: metadata.domain ?? "general",

                metadata

            };

            // Chroma returns a distance (lower = closer). Convert to
            // a similarity-style score (higher = better) so it can be
            // fused consistently with keyword scores.
            const distance = distances[index] ?? 0;

            const score = 1 / (1 + distance);

            return { chunk, score };

        });

    }

}
