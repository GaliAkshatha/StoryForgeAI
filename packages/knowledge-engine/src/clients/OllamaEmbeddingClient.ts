import { EmbeddingClient } from "../interfaces/EmbeddingClient";

export interface OllamaEmbeddingConfig {

    baseUrl: string;

    model: string;

}

// Talks to Ollama's /api/embed endpoint. Kept as a thin fetch-based
// client (no SDK dependency) to mirror the style already used by
// OllamaClient in @storyforge/llm-client.
export class OllamaEmbeddingClient implements EmbeddingClient {

    constructor(
        private readonly config: OllamaEmbeddingConfig
    ) {}

    async embed(
        text: string
    ): Promise<number[]> {

        const results = await this.embedBatch([text]);

        return results[0];

    }

    async embedBatch(
        texts: string[]
    ): Promise<number[][]> {

        if (texts.length === 0) {
            return [];
        }

        try {

            const response = await fetch(

                `${this.config.baseUrl}/api/embed`,

                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        model: this.config.model,

                        input: texts

                    })

                }

            );

            if (!response.ok) {

                throw new Error(
                    `Ollama embedding request failed: ${response.status}`
                );

            }

            const data = await response.json();

            const embeddings: number[][] | undefined =
                data.embeddings;

            if (!embeddings) {

                throw new Error(
                    "Ollama embedding response missing 'embeddings'."
                );

            }

            return embeddings;

        }
        catch (error) {

            console.error(
                "\n===== OLLAMA EMBEDDING ERROR =====\n"
            );

            console.dir(error, { depth: null });

            throw error;

        }

    }

}
