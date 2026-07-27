import { BM25Index } from "../retrieval/BM25Index";
import { KnowledgeChunk } from "../models/KnowledgeChunk";

function chunk(id: string, text: string, domain = "general"): KnowledgeChunk {

    return { id, text, source: "test", domain };

}

function main(): void {

    const index = new BM25Index();

    index.index([

        chunk("1", "A good leader listens before making decisions."),

        chunk("2", "Cybersecurity relies on strong passwords and vigilance."),

        chunk("3", "Leaders who listen build trust with their teams.")

    ]);

    const results = index.search("leader listens", 5);

    console.assert(
        results.length > 0,
        "BM25Index: expected at least one search result"
    );

    console.assert(
        results[0].chunk.id === "1" || results[0].chunk.id === "3",
        "BM25Index: expected a leadership-related chunk to rank first"
    );

    const irrelevant = index.search("passwords vigilance", 5);

    console.assert(
        irrelevant[0]?.chunk.id === "2",
        "BM25Index: expected cybersecurity chunk to rank first for its own query"
    );

    console.log("BM25Index tests passed.");

}

main();
