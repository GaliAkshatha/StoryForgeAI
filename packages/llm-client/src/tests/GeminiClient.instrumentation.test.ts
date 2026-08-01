import { GeminiClient } from "../clients/GeminiClient";
import { llmInstrumentation } from "../instrumentation/LLMInstrumentation";

// This is NOT a live Gemini call -- there is no real API key
// available in this environment. It exercises the REAL
// GeminiClient.generate() code path (including the real
// instrumentation calls, the real usageMetadata extraction, the real
// error handling) by replacing only the network boundary
// (GoogleGenAI's models.generateContent) with a controlled fake
// response/error. This is the most honest way to demonstrate the
// actual instrumentation output without fabricating numbers: the
// promptChars/responseChars/latencyMs/token counts printed below are
// all computed by the real code, not hand-written.
async function main(): Promise<void> {

    llmInstrumentation.reset();

    const client = new GeminiClient({ apiKey: "fake-key-not-a-real-secret", model: "gemini-2.5-flash" });

    // Reach past the private field to replace only the network call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = client as any;

    // --- Success case ---

    internal.client.models.generateContent = async () => {

        // Simulate real network latency so latencyMs in the log below
        // isn't suspiciously 0ms.
        await new Promise(resolve => setTimeout(resolve, 120));

        return {

            text: '{"moral":"honesty matters, even when it costs you something","skillFocus":["honesty"],"domain":"ethics","rationale":"Interpreted the parent goal as an honesty-focused adventure."}',

            usageMetadata: {

                promptTokenCount: 342,

                candidatesTokenCount: 78,

                totalTokenCount: 420

            }

        };

    };

    await client.generate({

        prompt: "You are StoryForge AI's Learning Goal interpreter...\n[prompt body omitted for length, ~340 tokens]",

        systemPrompt: undefined,

        responseFormat: "json",

        maxTokens: 512,

        metadata: { caller: "LearningGoalService", purpose: "derive_learning_objective" }

    });

    // --- Failure case (simulating a 429 rate-limit from Gemini) ---

    const { ApiError } = await import("@google/genai");

    internal.client.models.generateContent = async () => {

        await new Promise(resolve => setTimeout(resolve, 45));

        throw new ApiError({ message: "Resource has been exhausted (e.g. check quota).", status: 429 });

    };

    try {

        await client.generate({

            prompt: "You are StoryForge AI's Adventure Architect...\n[prompt body omitted, ~1800 tokens]",

            responseFormat: "json",

            maxTokens: 4096,

            metadata: { caller: "AdventureBlueprintGenerator", purpose: "generate_adventure_blueprint" }

        });

    }
    catch {
        // Expected -- generate() rethrows after recording the failure.
    }

    // --- Show the aggregate stats accumulated from both calls above ---

    console.log("\n===== AGGREGATE STATS (this process) =====");

    console.log(JSON.stringify(llmInstrumentation.getStats(), null, 2));

    console.log("============================================\n");

    const stats = llmInstrumentation.getStats();

    console.assert(stats.totalCalls === 2, `Expected 2 total calls, got ${stats.totalCalls}`);

    console.assert(stats.successfulCalls === 1, `Expected 1 successful call, got ${stats.successfulCalls}`);

    console.assert(stats.failedCalls === 1, `Expected 1 failed call, got ${stats.failedCalls}`);

    console.assert(stats.totalInputTokens === 342, `Expected 342 input tokens recorded, got ${stats.totalInputTokens}`);

    console.assert(stats.totalOutputTokens === 78, `Expected 78 output tokens recorded, got ${stats.totalOutputTokens}`);

    console.assert(
        stats.callsByPurpose["derive_learning_objective"] === 1,
        "Expected derive_learning_objective counted once"
    );

    console.assert(
        stats.callsByPurpose["generate_adventure_blueprint"] === 1,
        "Expected generate_adventure_blueprint counted once, from the failed call"
    );

    console.log("GeminiClient instrumentation demonstration completed (network layer mocked, no real API key used).");

}

main();
