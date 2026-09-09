import { ApiError } from "@google/genai";
import { GeminiClient } from "../clients/GeminiClient";

// This is NOT a live Gemini call -- same approach as
// GeminiClient.instrumentation.test.ts, replacing only the network
// boundary (models.generateContent) with a controlled fake. Proves
// the actual retry logic: transient errors (503/429) are retried
// with backoff and can still succeed; non-transient errors (404, a
// wrong model name that will never work) are NOT retried and fail
// immediately, so a real user isn't left waiting through pointless
// retries for something retrying can't fix.

function fakeApiError(status: number, message: string): ApiError {

    return new ApiError({ status, message });

}

async function main(): Promise<void> {

    // --- Transient error (503) twice, then success -- should
    // retry and ultimately return the successful result. ---

    {

        const client = new GeminiClient({ apiKey: "fake-key-not-a-real-secret", model: "gemini-3.6-flash" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internal = client as any;

        let callCount = 0;

        internal.client.models.generateContent = async () => {

            callCount++;

            if (callCount < 3) {
                throw fakeApiError(503, "This model is currently experiencing high demand.");
            }

            return { text: "a real successful response", usageMetadata: undefined };

        };

        const start = Date.now();

        const result = await client.generate({ prompt: "test prompt", responseFormat: "text" });

        const elapsedMs = Date.now() - start;

        console.assert(
            callCount === 3,
            `Expected exactly 3 attempts (2 failures + 1 success), got ${callCount}`
        );

        console.assert(
            result.text === "a real successful response",
            `Expected the eventual successful response to be returned, got '${result.text}'`
        );

        // Backoff for attempts 1 and 2 should be ~1000ms + ~2000ms =
        // ~3000ms minimum (allow generous slack for test-runner jitter).
        console.assert(
            elapsedMs >= 2900,
            `Expected real backoff delay between retries, only took ${elapsedMs}ms`
        );

    }

    // --- Non-transient error (404, wrong model name) -- must NOT
    // retry, should fail on the very first attempt. ---

    {

        const client = new GeminiClient({ apiKey: "fake-key-not-a-real-secret", model: "gemini-nonexistent" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internal = client as any;

        let callCount = 0;

        internal.client.models.generateContent = async () => {

            callCount++;

            throw fakeApiError(404, "This model models/gemini-nonexistent is no longer available.");

        };

        let threw = false;

        try {

            await client.generate({ prompt: "test prompt", responseFormat: "text" });

        }
        catch {

            threw = true;

        }

        console.assert(threw, "Expected the 404 to propagate as a real failure");

        console.assert(
            callCount === 1,
            `Expected NO retries for a non-transient error, got ${callCount} attempts`
        );

    }

    // --- Transient error that never resolves -- must give up after
    // MAX_ATTEMPTS, not retry forever. ---

    {

        const client = new GeminiClient({ apiKey: "fake-key-not-a-real-secret", model: "gemini-3.6-flash" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internal = client as any;

        let callCount = 0;

        internal.client.models.generateContent = async () => {

            callCount++;

            throw fakeApiError(503, "This model is currently experiencing high demand.");

        };

        let threw = false;

        try {

            await client.generate({ prompt: "test prompt", responseFormat: "text" });

        }
        catch {

            threw = true;

        }

        console.assert(threw, "Expected the persistent 503 to eventually propagate as a real failure");

        console.assert(
            callCount === 3,
            `Expected exactly MAX_ATTEMPTS (3) attempts before giving up, got ${callCount}`
        );

    }

    console.log("GeminiClient retry tests passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
