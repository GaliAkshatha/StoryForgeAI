import { GoogleGenAI, Schema, ApiError } from "@google/genai";

import { LLMClient } from "../interfaces/LLMClient";
import { LLMConfig } from "../config/LLMConfig";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";
import { llmInstrumentation } from "../instrumentation/LLMInstrumentation";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

// Raw response content is only ever printed when explicitly opted
// into -- dumping every generated JSON response by default is noisy
// and can expose generated/user-derived content (a parent's own
// words, a child's name, etc.) in logs. Set
// LLM_DEBUG_RAW_RESPONSE=true locally when actually debugging a
// parse failure.
const DEBUG_RAW_RESPONSE = process.env.LLM_DEBUG_RAW_RESPONSE === "true";

export class GeminiClient implements LLMClient {

    private readonly client: GoogleGenAI;

    constructor(
        private readonly config: LLMConfig
    ) {

        this.client = new GoogleGenAI({
            apiKey: config.apiKey
        });

    }

    async generate(
        request: LLMRequest
    ): Promise<LLMResponse> {

        const model = this.config.model || DEFAULT_GEMINI_MODEL;

        const startedAt = Date.now();

        try {

            const response =
                await this.client.models.generateContent({

                    model,

                    contents: request.prompt,

                    config: {

                        systemInstruction: request.systemPrompt,

                        temperature: request.temperature,

                        topP: request.topP,

                        maxOutputTokens: request.maxTokens,

                        responseMimeType:
                            request.responseFormat === "json"
                                ? "application/json"
                                : undefined,

                        // responseMimeType alone only *asks* the
                        // model for JSON -- it does not guarantee
                        // syntactically valid output (raw newlines
                        // inside string values are a common failure
                        // mode). responseSchema switches Gemini into
                        // constrained decoding, which does guarantee
                        // schema-conformant, syntactically valid JSON.
                        responseSchema:
                            request.responseSchema as Schema | undefined

                    }

                });

            const text = response.text ?? "";

            const latencyMs = Date.now() - startedAt;

            // Only ever populated from what Gemini actually reports --
            // never estimated from character counts.
            const usageMetadata = response.usageMetadata;

            const usage = usageMetadata ? {

                promptTokens: usageMetadata.promptTokenCount ?? 0,

                completionTokens: usageMetadata.candidatesTokenCount ?? 0,

                totalTokens: usageMetadata.totalTokenCount ?? 0

            } : undefined;

            llmInstrumentation.recordSuccess({

                caller: request.metadata?.caller,

                purpose: request.metadata?.purpose,

                model,

                promptChars: request.prompt.length,

                systemPromptChars: request.systemPrompt?.length ?? 0,

                maxOutputTokens: request.maxTokens,

                responseChars: text.length,

                latencyMs,

                inputTokens: usageMetadata?.promptTokenCount,

                outputTokens: usageMetadata?.candidatesTokenCount,

                totalTokens: usageMetadata?.totalTokenCount

            });

            if (DEBUG_RAW_RESPONSE && request.responseFormat === "json") {

                console.log(
                    "\n===== GEMINI RAW JSON RESPONSE (LLM_DEBUG_RAW_RESPONSE=true) =====\n" + text
                );

            }

            return {

                text,

                model,

                finishReason: "STOP",

                usage

            };

        }
        catch (error) {

            const latencyMs = Date.now() - startedAt;

            const status = error instanceof ApiError ? error.status : undefined;

            llmInstrumentation.recordFailure({

                caller: request.metadata?.caller,

                purpose: request.metadata?.purpose,

                model,

                promptChars: request.prompt.length,

                systemPromptChars: request.systemPrompt?.length ?? 0,

                maxOutputTokens: request.maxTokens,

                latencyMs,

                status

            });

            console.error(

                "\n===== GEMINI ERROR =====\n" +
                `message: ${error instanceof Error ? error.message : String(error)}\n` +
                `status: ${status ?? "n/a"}\n`

            );

            throw error;

        }

    }

}
