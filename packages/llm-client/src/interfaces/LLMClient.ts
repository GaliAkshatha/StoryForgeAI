import { LLMRequest } from "../models/LLMRequest";
import { LLMResponse } from "../models/LLMResponse";

export interface LLMClient {

    generate(
        request: LLMRequest
    ): Promise<LLMResponse>;

}