import { KeywordIndex } from "../interfaces/KeywordIndex";
import { KnowledgeChunk } from "../models/KnowledgeChunk";
import { ScoredChunk } from "../models/RetrievalResult";

interface IndexedDocument {

    chunk: KnowledgeChunk;

    termFrequencies: Map<string, number>;

    length: number;

}

// Classic Okapi BM25, implemented from scratch (no external search
// library) so the "AI Stack" requirement of BM25 + hybrid retrieval
// doesn't pull in LangChain/LlamaIndex or any other retrieval
// framework -- just the algorithm itself.
export class BM25Index implements KeywordIndex {

    private static readonly K1 = 1.5;

    private static readonly B = 0.75;

    private documents: IndexedDocument[] = [];

    private documentFrequency = new Map<string, number>();

    private averageDocumentLength = 0;

    index(
        chunks: KnowledgeChunk[]
    ): void {

        for (const chunk of chunks) {

            const terms = tokenize(chunk.text);

            const termFrequencies = new Map<string, number>();

            for (const term of terms) {

                termFrequencies.set(
                    term,
                    (termFrequencies.get(term) ?? 0) + 1
                );

            }

            for (const term of termFrequencies.keys()) {

                this.documentFrequency.set(
                    term,
                    (this.documentFrequency.get(term) ?? 0) + 1
                );

            }

            this.documents.push({
                chunk,
                termFrequencies,
                length: terms.length
            });

        }

        const totalLength = this.documents.reduce(
            (sum, doc) => sum + doc.length,
            0
        );

        this.averageDocumentLength =
            this.documents.length > 0
                ? totalLength / this.documents.length
                : 0;

    }

    search(
        query: string,
        topK: number,
        domain?: string
    ): ScoredChunk[] {

        const queryTerms = tokenize(query);

        const candidates = domain
            ? this.documents.filter(d => d.chunk.domain === domain)
            : this.documents;

        const n = this.documents.length;

        const scored = candidates.map(doc => {

            let score = 0;

            for (const term of queryTerms) {

                const termFrequency =
                    doc.termFrequencies.get(term) ?? 0;

                if (termFrequency === 0) {
                    continue;
                }

                const documentFrequency =
                    this.documentFrequency.get(term) ?? 0;

                const idf = Math.log(
                    1 +
                    (n - documentFrequency + 0.5) /
                    (documentFrequency + 0.5)
                );

                const normalizedLength =
                    this.averageDocumentLength > 0
                        ? doc.length / this.averageDocumentLength
                        : 1;

                const numerator =
                    termFrequency * (BM25Index.K1 + 1);

                const denominator =
                    termFrequency +
                    BM25Index.K1 *
                    (1 - BM25Index.B + BM25Index.B * normalizedLength);

                score += idf * (numerator / denominator);

            }

            return { chunk: doc.chunk, score };

        });

        return scored

            .filter(result => result.score > 0)

            .sort((a, b) => b.score - a.score)

            .slice(0, topK);

    }

}

function tokenize(text: string): string[] {

    return text

        .toLowerCase()

        .split(/[^a-z0-9]+/)

        .filter(term => term.length > 1);

}
