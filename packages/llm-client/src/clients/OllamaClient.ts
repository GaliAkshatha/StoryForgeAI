import { LLMClient } from "../interfaces/LLMClient";
import { LLMConfig } from "../config/LLMConfig";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export const DEFAULT_OLLAMA_MODEL = "qwen3";

export class OllamaClient implements LLMClient {

    constructor(

        private readonly config: LLMConfig

    ) {}

    async generate(

        request: LLMRequest

    ): Promise<LLMResponse> {

        try {

            const response =
                await fetch(

                    `${this.config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL}/api/generate`,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            model:
                                this.config.model || DEFAULT_OLLAMA_MODEL,

                            prompt:
                                request.prompt,

                            system:
                                request.systemPrompt,

                            // Ollama (0.5+) accepts either the
                            // string "json" (loose JSON mode) or a
                            // full JSON Schema object for constrained
                            // structured output. Prefer the schema
                            // when the caller supplied one -- same
                            // reasoning as GeminiClient's
                            // responseSchema.
                            format:
                                request.responseSchema ??
                                (request.responseFormat === "json"
                                    ? "json"
                                    : undefined),

                            options: {

                                temperature: request.temperature,

                                top_p: request.topP,

                                num_predict: request.maxTokens

                            },

                            stream: false

                        })

                    }

                );

            if (!response.ok) {

                throw new Error(

                    `Ollama request failed: ${response.status}`

                );

            }

            const data =
                await response.json();

            if (request.responseFormat === "json") {

                console.log(
                    "\n===== OLLAMA RAW JSON RESPONSE =====\n" + data.response
                );

            }

            return {

                text:
                    data.response,

                model:
                    this.config.model || DEFAULT_OLLAMA_MODEL,

                finishReason:
                    "STOP"

            };

        }

        catch (error) {

            console.error(

                "\n===== OLLAMA ERROR =====\n"

            );

            console.dir(

                error,

                {

                    depth: null

                }

            );

            throw error;

        }

    }

}
