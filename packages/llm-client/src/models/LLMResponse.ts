export interface TokenUsage {

    promptTokens: number;

    completionTokens: number;

    totalTokens: number;

}

export interface LLMResponse {

    text: string;

    model: string;

    finishReason?: string;

    usage?: TokenUsage;

}