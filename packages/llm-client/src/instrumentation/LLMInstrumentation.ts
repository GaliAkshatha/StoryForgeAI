// Centralized instrumentation for every LLM call, regardless of
// provider. Lives in llm-client because this IS the shared LLM
// boundary -- GeminiClient and OllamaClient both call into this
// instead of each rolling their own logging, which is what makes
// this a one-place-to-look answer to "how many LLM calls does one
// adventure make" instead of something scattered across 11 call
// sites.
//
// Deliberately just console logging + an in-memory singleton --
// no database table, no telemetry platform, no new infrastructure.
// This is step 1 of the migration plan: measure before changing
// anything.

export interface LLMCallSuccessInput {

    caller?: string;

    purpose?: string;

    model: string;

    promptChars: number;

    systemPromptChars: number;

    maxOutputTokens?: number;

    responseChars: number;

    latencyMs: number;

    // Only ever populated from the provider's own reported usage
    // metadata (Gemini's usageMetadata, Ollama's
    // prompt_eval_count/eval_count) -- never estimated. Undefined
    // means the provider didn't report it for this call.
    inputTokens?: number;

    outputTokens?: number;

    totalTokens?: number;

}

export interface LLMCallFailureInput {

    caller?: string;

    purpose?: string;

    model: string;

    promptChars: number;

    systemPromptChars: number;

    maxOutputTokens?: number;

    latencyMs: number;

    // HTTP/API status code when the provider/SDK exposes one (e.g.
    // Gemini's ApiError.status, or an Ollama HTTP response status).
    status?: number;

}

export interface LLMAggregateStats {

    totalCalls: number;

    successfulCalls: number;

    failedCalls: number;

    totalInputTokens: number;

    totalOutputTokens: number;

    totalTokens: number;

    totalLatencyMs: number;

    // Keyed by `purpose` (falls back to "unknown" when a call site
    // didn't supply one via LLMRequest.metadata).
    callsByPurpose: Record<string, number>;

}

const UNKNOWN = "unknown";

function emptyStats(): LLMAggregateStats {

    return {

        totalCalls: 0,

        successfulCalls: 0,

        failedCalls: 0,

        totalInputTokens: 0,

        totalOutputTokens: 0,

        totalTokens: 0,

        totalLatencyMs: 0,

        callsByPurpose: {}

    };

}

export class LLMInstrumentation {

    private stats: LLMAggregateStats = emptyStats();

    recordSuccess(
        input: LLMCallSuccessInput
    ): void {

        const purpose = input.purpose ?? UNKNOWN;

        this.stats.totalCalls += 1;

        this.stats.successfulCalls += 1;

        this.stats.totalLatencyMs += input.latencyMs;

        this.stats.totalInputTokens += input.inputTokens ?? 0;

        this.stats.totalOutputTokens += input.outputTokens ?? 0;

        this.stats.totalTokens += input.totalTokens ?? 0;

        this.stats.callsByPurpose[purpose] =
            (this.stats.callsByPurpose[purpose] ?? 0) + 1;

        console.log(

            "\n===== LLM CALL =====\n" +
            `timestamp: ${new Date().toISOString()}\n` +
            `caller: ${input.caller ?? UNKNOWN}\n` +
            `purpose: ${purpose}\n` +
            `model: ${input.model}\n` +
            `promptChars: ${input.promptChars}\n` +
            `systemPromptChars: ${input.systemPromptChars}\n` +
            `maxOutputTokens: ${input.maxOutputTokens ?? "n/a"}\n` +
            `inputTokens: ${input.inputTokens ?? "n/a"}\n` +
            `outputTokens: ${input.outputTokens ?? "n/a"}\n` +
            `totalTokens: ${input.totalTokens ?? "n/a"}\n` +
            `responseChars: ${input.responseChars}\n` +
            `latencyMs: ${input.latencyMs}\n` +
            `success: true\n` +
            "====================\n"

        );

    }

    recordFailure(
        input: LLMCallFailureInput
    ): void {

        const purpose = input.purpose ?? UNKNOWN;

        this.stats.totalCalls += 1;

        this.stats.failedCalls += 1;

        this.stats.totalLatencyMs += input.latencyMs;

        this.stats.callsByPurpose[purpose] =
            (this.stats.callsByPurpose[purpose] ?? 0) + 1;

        console.log(

            "\n===== LLM CALL FAILED =====\n" +
            `timestamp: ${new Date().toISOString()}\n` +
            `caller: ${input.caller ?? UNKNOWN}\n` +
            `purpose: ${input.purpose ?? UNKNOWN}\n` +
            `model: ${input.model}\n` +
            `promptChars: ${input.promptChars}\n` +
            `systemPromptChars: ${input.systemPromptChars}\n` +
            `maxOutputTokens: ${input.maxOutputTokens ?? "n/a"}\n` +
            `latencyMs: ${input.latencyMs}\n` +
            `status: ${input.status ?? "n/a"}\n` +
            `success: false\n` +
            "===========================\n"

        );

    }

    // Returns a copy -- callers can't mutate internal state through
    // the returned object.
    getStats(): LLMAggregateStats {

        return {

            ...this.stats,

            callsByPurpose: { ...this.stats.callsByPurpose }

        };

    }

    // Test-only: lets instrumentation tests start from a clean slate
    // without needing a fresh process.
    reset(): void {

        this.stats = emptyStats();

    }

}

// Single shared instance -- this IS the point (one process-wide
// place aggregating every call, regardless of which service or
// provider made it).
export const llmInstrumentation = new LLMInstrumentation();
