import { LLMClient } from "../interfaces/LLMClient";
import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";
import { LLMConfig } from "../config/LLMConfig";

export class GeminiClient implements LLMClient {

    constructor(
        private readonly config: LLMConfig
    ) {}

    async generate(
        request: LLMRequest
    ): Promise<LLMResponse> {

        throw new Error(
            "GeminiClient not implemented."
        );

    }

}