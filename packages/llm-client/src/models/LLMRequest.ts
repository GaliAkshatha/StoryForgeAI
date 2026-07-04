export interface LLMRequest {

    prompt: string;

    systemPrompt?: string;

    temperature?: number;

    topP?: number;

    maxTokens?: number;

    responseFormat?: "text" | "json";

}