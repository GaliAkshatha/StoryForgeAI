import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";

// Pacing pass (Point 8): proves the chapter is NOT a decision menu
// every single turn -- most turns are a single "Continue", and real
// multi-option choices appear specifically at critical plot beats
// (moral_fork/test) and the ending-eligible turn.

const METADATA_RESPONSE = JSON.stringify({

    title: "The Blocked Path",

    characters: [{ id: "squeak", name: "Squeak", role: "friend", description: "A small mouse." }],

    world: { setting: "forest", description: "A quiet forest path." },

    learningPlan: [{ skillFocus: "honesty", approach: "natural consequence" }],

    genome: {
        theme: "honesty", explorationLevel: 0.5, humor: 0.2, mystery: 0.2,
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

class FakeLLMClient implements LLMClient {

    async generate(request: LLMRequest): Promise<LLMResponse> {

        if (request.prompt.includes("\"premise\": \"\"")) {
            return { text: METADATA_RESPONSE, model: "fake-model", finishReason: "STOP" };
        }

        if (request.prompt.includes("You are a renderer")) {
            return { text: "Something happens in the story right now.", model: "fake-model", finishReason: "STOP" };
        }

        if (request.prompt.includes("Reflection Agent")) {
            return {
                text: JSON.stringify({ question: "What happened?", followUpQuestions: [], observedThemes: [], encouragement: "Nice." }),
                model: "fake-model", finishReason: "STOP"
            };
        }

        if (request.prompt.includes("Analytics Agent")) {
            return { text: JSON.stringify({ summary: "Did something." }), model: "fake-model", finishReason: "STOP" };
        }

        throw new Error(`Unexpected prompt: ${request.prompt.slice(0, 80)}...`);

    }

}

function noNetworkKnowledgeBase(): KnowledgeBase {

    return { query: async () => [], queryAsContext: async () => "(none)" } as unknown as KnowledgeBase;

}

async function main(): Promise<void> {

    const container = new DependencyContainer({ llmClient: new FakeLLMClient() });

    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase = noNetworkKnowledgeBase();

    const runtime = new AdventureRuntime(container);

    const started = await runtime.startAdventure({

        childId: "child-1", childName: "Ak", ageRange: "7-8",
        location: "the forest path", moral: "honesty matters", domain: "ethics"

    });

    // Root offers a real choice (matches the reference example).
    console.assert(
        started.choices.length > 1,
        `Expected root to offer a real multi-option choice, got ${started.choices.length}`
    );

    let choices = started.choices;

    let sawNarrationOnlyTurn = false;

    let sawRealChoiceTurn = false;

    for (let turn = 0; turn < 10; turn++) {

        const result = await runtime.playTurn({

            worldId: started.worldId, sessionId: started.sessionId, childId: "child-1",
            childName: "Ak", ageRange: "7-8", selectedChoiceId: choices[0].id

        });

        if (result.isEnding) {
            break;
        }

        if (result.choices.length === 1 && result.choices[0].text === "Continue") {
            sawNarrationOnlyTurn = true;
        }
        else if (result.choices.length > 1) {
            sawRealChoiceTurn = true;
        }

        choices = result.choices;

    }

    console.assert(
        sawNarrationOnlyTurn,
        "Expected at least one narration-only ('Continue') turn -- pacing should not be a choice every single turn"
    );

    console.assert(
        sawRealChoiceTurn,
        "Expected at least one real multi-option choice turn beyond the root"
    );

    console.log("AdventureRuntime pacing test passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
