export interface LLMRequest {

    prompt: string;

    systemPrompt?: string;

    temperature?: number;

    topP?: number;

    maxTokens?: number;

    responseFormat?: "text" | "json";

    // Optional JSON Schema (subset) constraining the shape of the
    // response when responseFormat is "json". Kept as `unknown` here
    // so llm-client stays provider-agnostic -- GeminiClient casts it
    // to its SDK's Schema type, OllamaClient forwards it as-is (both
    // accept a JSON-Schema-shaped object). When provided, this
    // triggers constrained decoding rather than a prompt-only
    // instruction, which is what actually guarantees syntactically
    // valid JSON -- responseFormat alone does not.
    responseSchema?: unknown;

    // Observability only -- never read by any provider to change
    // behavior. Optional so every existing call site keeps compiling
    // unchanged; callers that want their LLM usage attributed in the
    // instrumentation log/aggregate stats (see
    // instrumentation/LLMInstrumentation.ts) can supply it.
    metadata?: {

        caller?: string;

        purpose?: string;

    };

}