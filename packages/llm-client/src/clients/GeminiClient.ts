import { GoogleGenAI } from "@google/genai";

import { LLMClient } from "../interfaces/LLMClient";
import { LLMConfig } from "../config/LLMConfig";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";
import { LLMError } from "../errors/LLMError";

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

                    model: this.config.model,

                    contents: request.prompt

                });

            return {

                text: response.text ?? "",

                model: this.config.model,

                finishReason: "STOP"

            };

        }
        catch (error) {

            console.error("\n===== ORIGINAL ERROR =====\n");

            console.dir(error,{
                depth: null
            });

            throw error;

        }

    }

}