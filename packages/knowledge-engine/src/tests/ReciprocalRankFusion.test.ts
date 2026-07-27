import { ReciprocalRankFusion } from "../retrieval/ReciprocalRankFusion";
import { KnowledgeChunk } from "../models/KnowledgeChunk";

function chunk(id: string): KnowledgeChunk {

    return { id, text: id, source: "test", domain: "general" };

}

function main(): void {

    const rrf = new ReciprocalRankFusion(60);

    const vectorResults = [
        { chunk: chunk("a"), score: 0.9 },
        { chunk: chunk("b"), score: 0.8 },
        { chunk: chunk("c"), score: 0.7 }
    ];

    const keywordResults = [
        { chunk: chunk("b"), score: 5.1 },
        { chunk: chunk("d"), score: 4.2 },
        { chunk: chunk("a"), score: 3.0 }
    ];

    const fused = rrf.fuse(
        [
            { source: "vector", results: vectorResults },
            { source: "keyword", results: keywordResults }
        ],
        4
    );

    console.assert(
        fused[0].chunk.id === "a" || fused[0].chunk.id === "b",
        "RRF: expected a chunk appearing in both lists to rank first"
    );

    const topEntry = fused.find(r => r.chunk.id === "a")!;

    console.assert(
        topEntry.matchedBy.includes("vector") &&
        topEntry.matchedBy.includes("keyword"),
        "RRF: expected chunk 'a' to be marked as matched by both retrievers"
    );

    console.assert(
        fused.length === 4,
        "RRF: expected 4 unique fused results (a, b, c, d)"
    );

    console.log("ReciprocalRankFusion tests passed.");

}

main();
