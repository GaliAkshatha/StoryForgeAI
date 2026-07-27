export interface KnowledgeConfig {

    // Ollama server used for embeddings. Mandatory model is
    // "nomic-embed-text" per the AI Stack requirements.
    ollamaBaseUrl: string;

    embeddingModel: string;

    // ChromaDB server used as the vector store.
    chromaBaseUrl: string;

    chromaCollection: string;

    // Reciprocal Rank Fusion constant. 60 is the standard default
    // used in the original RRF paper.
    rrfK: number;

}

export const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfig = {

    ollamaBaseUrl: "http://localhost:11434",

    embeddingModel: "nomic-embed-text",

    chromaBaseUrl: "http://localhost:8000",

    chromaCollection: "storyforge_knowledge",

    rrfK: 60

};
