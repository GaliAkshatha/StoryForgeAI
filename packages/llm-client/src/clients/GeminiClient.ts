import { GoogleGenAI, Schema } from "@google/genai";

import { LLMClient } from "../interfaces/LLMClient";
import { LLMConfig } from "../config/LLMConfig";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

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

        try {

            const response =
                await this.client.models.generateContent({

                    model: this.config.model || DEFAULT_GEMINI_MODEL,

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

            if (request.responseFormat === "json") {

                // Always visible, not just on parse failure -- the
                // failure happens one layer up (JsonParser, called by
                // the agent/engine), so by the time something there
                // logs a parse error, having the exact raw text that
                // caused it already in the log is what actually makes
                // it debuggable.
                console.log(
                    "\n===== GEMINI RAW JSON RESPONSE =====\n" + text
                );

            }

            return {

                text,

                model: this.config.model || DEFAULT_GEMINI_MODEL,

                finishReason: "STOP"

            };

        }
        catch (error) {

            console.error("\n===== GEMINI ERROR =====\n");

            console.dir(error, { depth: null });

            throw error;

        }

    }

}
