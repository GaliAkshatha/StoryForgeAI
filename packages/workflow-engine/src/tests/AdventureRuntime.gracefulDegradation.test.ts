import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";

// Stabilization pass (Part 8/9): AnalyticsAgent/ReflectionAgent
// failures (e.g. a real Gemini 429/503) must NEVER crash playTurn()
// or surface a raw error -- gameplay must reach a genuine ending
// gracefully, with a deterministic fallback standing in.

const METADATA_RESPONSE = JSON.stringify({

    title: "The Blocked Path",

    characters: [{ id: "squeak", name: "Squeak", role: "friend", description: "A small mouse." }],

    world: { setting: "forest", description: "A quiet forest path." },

    learningPlan: [{ skillFocus: "collaboration", approach: "natural consequence" }],

    genome: {
        theme: "helping others", explorationLevel: 0.5, humor: 0.2, mystery: 0.2,
        fantasyDensity: 0.5, puzzleDensity: 0.3, npcComplexity: 0.3, vocabulary: "simple"
    },

    premise: "Squeak looks worried near a fallen branch",

    initialProblem: "a fallen branch blocks the path",

    plotOutline: [
        { beat: "hook", summary: "a friend needs help with a fallen branch" },
        { beat: "complication", summary: "the branch is heavier than expected" },
        { beat: "moral_fork", summary: "decide whether to admit a mistake" },
        { beat: "test", summary: "someone else learns what really happened" },
        { beat: "resolution", summary: "trust is rebuilt" }
    ]

});

class FailingAnalyticsReflectionLLMClient implements LLMClient {

    async generate(request: LLMRequest): Promise<LLMResponse> {

        if (request.prompt.includes("\"premise\": \"\"")) {
            return { text: METADATA_RESPONSE, model: "fake-model", finishReason: "STOP" };
        }

        if (request.prompt.includes("You are a renderer")) {
            return { text: "Something happens in the story right now.", model: "fake-model", finishReason: "STOP" };
        }

        // Simulate a real Gemini outage for BOTH Analytics and Reflection.
        if (request.prompt.includes("Reflection Agent") || request.prompt.includes("Analytics Agent")) {
            throw new Error("503 Service Unavailable: the model is overloaded");
        }

        throw new Error(`Unexpected prompt: ${request.prompt.slice(0, 80)}...`);

    }

}

function noNetworkKnowledgeBase(): KnowledgeBase {

    return { query: async () => [], queryAsContext: async () => "(none)" } as unknown as KnowledgeBase;

}

async function main(): Promise<void> {

    const container = new DependencyContainer({ llmClient: new FailingAnalyticsReflectionLLMClient() });

    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase = noNetworkKnowledgeBase();

    const runtime = new AdventureRuntime(container);

    const started = await runtime.startAdventure({

        childId: "child-1", childName: "Ak", ageRange: "7-8",
        location: "the forest path", moral: "collaboration matters", domain: "ethics"

    });

    let choices = started.choices;

    let reachedEnding = false;

    // Play until a genuine ending -- Analytics/Reflection only run
    // there, and both are rigged to fail every time in this test.
    for (let turn = 0; turn < 15 && !reachedEnding; turn++) {

        const result = await runtime.playTurn({

            worldId: started.worldId, sessionId: started.sessionId, childId: "child-1",
            childName: "Ak", ageRange: "7-8", selectedChoiceId: choices[0].id

        });

        if (result.isEnding) {

            reachedEnding = true;

            // The turn must have completed WITHOUT throwing (we're
            // past the await above), and must still carry SOME
            // analytics/reflection content -- the deterministic
            // fallback, not nothing.
            console.assert(
                result.analytics !== undefined,
                "Expected a deterministic analytics fallback even though AnalyticsAgent failed"
            );

            console.assert(
                result.reflection !== undefined,
                "Expected a deterministic reflection fallback even though ReflectionAgent failed"
            );

            console.assert(
                result.analytics!.summary.length > 0,
                "Expected the fallback analytics summary to be non-empty"
            );

            console.assert(
                result.reflection!.question.length > 0,
                "Expected the fallback reflection question to be non-empty"
            );

            console.assert(
                result.narrative.length > 0,
                "Expected the ending's narrative to still be present despite Analytics/Reflection failing"
            );

        }
        else {

            choices = result.choices;

        }

    }

    console.assert(
        reachedEnding,
        "Expected the chapter to still reach a genuine ending despite Analytics/Reflection failures throughout"
    );

    console.log("AdventureRuntime graceful degradation test passed.");

}

main().catch(error => {

    console.error("TEST FAILED -- an error escaped playTurn() despite the graceful-degradation fix:", error);

    process.exitCode = 1;

});
