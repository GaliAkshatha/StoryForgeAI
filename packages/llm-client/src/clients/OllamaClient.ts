import { LLMClient } from "../interfaces/LLMClient";
import { LLMConfig } from "../config/LLMConfig";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";
import { llmInstrumentation } from "../instrumentation/LLMInstrumentation";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export const DEFAULT_OLLAMA_MODEL = "qwen3";

// See GeminiClient for why this is opt-in, not default-on.
const DEBUG_RAW_RESPONSE = process.env.LLM_DEBUG_RAW_RESPONSE === "true";

export class OllamaClient implements LLMClient {

    constructor(

        private readonly config: LLMConfig

    ) {}

    async generate(

        request: LLMRequest

    ): Promise<LLMResponse> {

        const model = this.config.model || DEFAULT_OLLAMA_MODEL;

        const startedAt = Date.now();

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

                            model,

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

            const latencyMs = Date.now() - startedAt;

            if (!response.ok) {

                llmInstrumentation.recordFailure({

                    caller: request.metadata?.caller,

                    purpose: request.metadata?.purpose,

                    model,

                    promptChars: request.prompt.length,

                    systemPromptChars: request.systemPrompt?.length ?? 0,

                    maxOutputTokens: request.maxTokens,

                    latencyMs,

                    status: response.status

                });

                throw new Error(

                    `Ollama request failed: ${response.status}`

                );

            }

            const data =
                await response.json();

            // Ollama's non-streaming /api/generate response includes
            // these counts directly -- real usage, never estimated.
            // Undefined/missing fields are left undefined rather than
            // guessed at.
            const usage = (
                typeof data.prompt_eval_count === "number" ||
                typeof data.eval_count === "number"
            ) ? {

                promptTokens: data.prompt_eval_count ?? 0,

                completionTokens: data.eval_count ?? 0,

                totalTokens:
                    (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0)

            } : undefined;

            llmInstrumentation.recordSuccess({

                caller: request.metadata?.caller,

                purpose: request.metadata?.purpose,

                model,

                promptChars: request.prompt.length,

                systemPromptChars: request.systemPrompt?.length ?? 0,

                maxOutputTokens: request.maxTokens,

                responseChars: (data.response ?? "").length,

                latencyMs,

                inputTokens: data.prompt_eval_count,

                outputTokens: data.eval_count,

                totalTokens: usage?.totalTokens

            });

            if (DEBUG_RAW_RESPONSE && request.responseFormat === "json") {

                console.log(
                    "\n===== OLLAMA RAW JSON RESPONSE (LLM_DEBUG_RAW_RESPONSE=true) =====\n" + data.response
                );

            }

            return {

                text:
                    data.response,

                model,

                finishReason:
                    "STOP",

                usage

            };

        }

        catch (error) {

            const latencyMs = Date.now() - startedAt;

            // Failure was already recorded above for a non-ok HTTP
            // response; this branch also covers network-level
            // failures (fetch itself throwing), which need their own
            // record since the block above never ran.
            if (!(error instanceof Error && error.message.startsWith("Ollama request failed:"))) {

                llmInstrumentation.recordFailure({

                    caller: request.metadata?.caller,

                    purpose: request.metadata?.purpose,

                    model,

                    promptChars: request.prompt.length,

                    systemPromptChars: request.systemPrompt?.length ?? 0,

                    maxOutputTokens: request.maxTokens,

                    latencyMs

                });

            }

            console.error(

                "\n===== OLLAMA ERROR =====\n" +
                `message: ${error instanceof Error ? error.message : String(error)}\n`

            );

            throw error;

        }

    }

}
