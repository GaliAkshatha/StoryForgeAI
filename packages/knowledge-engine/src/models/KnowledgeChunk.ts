export interface KnowledgeChunk {

    id: string;

    text: string;

    source: string;

    // e.g. "leadership", "history", "cybersecurity", "business",
    // "science", "healthcare", "ethics" -- matches the Final Goal's
    // list of learning domains the platform can power.
    domain: string;

    metadata?: Record<string, string>;

}
