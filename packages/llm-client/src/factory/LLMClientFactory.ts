import { LLMClient } from "../interfaces/LLMClient";
import { GeminiClient, DEFAULT_GEMINI_MODEL } from "../clients/GeminiClient";
import { OllamaClient, DEFAULT_OLLAMA_MODEL } from "../clients/OllamaClient";

export type LLMProviderName = "gemini" | "ollama";

export interface LLMClientFactoryConfig {

    // Defaults to "gemini" -- Gemini is the default provider as of
    // v2.0. Ollama remains fully supported for local/offline use.
    provider?: LLMProviderName;

    geminiApiKey?: string;

    geminiModel?: string;

    ollamaBaseUrl?: string;

    ollamaModel?: string;

}

// The ONLY place in the codebase that knows both concrete LLMClient
// implementations exist. Everything downstream (agents,
// ConsequenceEngine, DependencyContainer's `ai` bundle) depends only
// on the LLMClient interface and never learns which provider is
// actually running -- swapping providers never touches agent code.
export class LLMClientFactory {

    static create(
        config: LLMClientFactoryConfig
    ): LLMClient {

        const provider = config.provider ?? "gemini";

        switch (provider) {

            case "gemini": {

                if (!config.geminiApiKey) {

                    throw new Error(
                        "LLMClientFactory: GEMINI_API_KEY is required when provider is 'gemini'."
                    );

                }

                return new GeminiClient({

                    apiKey: config.geminiApiKey,

                    model: config.geminiModel ?? DEFAULT_GEMINI_MODEL

                });

            }

            case "ollama": {

                return new OllamaClient({

                    // Ollama's local server doesn't require an API
                    // key; LLMConfig.apiKey is unused by OllamaClient.
                    apiKey: "",

                    model: config.ollamaModel ?? DEFAULT_OLLAMA_MODEL,

                    baseUrl: config.ollamaBaseUrl

                });

            }

            default: {

                throw new Error(
                    `LLMClientFactory: unknown provider '${provider}'.`
                );

            }

        }

    }

}
