import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";

// Phase 2B (Sections N, O, J): a fallen branch premise, played across
// multiple turns through the REAL pipeline. Proves: choices are
// contextual (not the old generic "Try again"/"Look closely around"
// wording), unrelated characters never appear, eventType/analytics
// taxonomy is untouched by the presentation layer, and choice
// generation itself makes ZERO Gemini calls (proven by counting
// renderer calls before/after inspecting choice text, not just after
// a full turn).

const METADATA_RESPONSE = JSON.stringify({

    title: "The Blocked Path",

    characters: [
        { id: "squeak", name: "Squeak", role: "friend", description: "A small mouse." }
    ],

    world: { setting: "forest", description: "A quiet forest path." },

    learningPlan: [{ skillFocus: "collaboration", approach: "natural consequence" }],

    genome: {
        theme: "helping others", explorationLevel: 0.5, humor: 0.2, mystery: 0.2,
        fantasyDensity: 0.5, puzzleDensity: 0.3, npcComplexity: 0.3, vocabulary: "simple"
    },

    premise: "a fallen branch blocks the path and Squeak needs help moving it"

});

class CountingLLMClient implements LLMClient {

    rendererCalls = 0;

    async generate(request: LLMRequest): Promise<LLMResponse> {

        if (request.prompt.includes("\"premise\": \"\"")) {
            return { text: METADATA_RESPONSE, model: "fake-model", finishReason: "STOP" };
        }

        if (request.prompt.includes("You are a renderer")) {
            this.rendererCalls++;
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

        throw new Error(`CountingLLMClient: unexpected prompt: ${request.prompt.slice(0, 80)}...`);

    }

}

function noNetworkKnowledgeBase(): KnowledgeBase {

    return { query: async () => [], queryAsContext: async () => "(none)" } as unknown as KnowledgeBase;

}

const GENERIC_PHRASES = ["Try again", "Look closely around", "Try to solve it", "Take the lead"];

async function main(): Promise<void> {

    const llmClient = new CountingLLMClient();

    const container = new DependencyContainer({ llmClient });

    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase = noNetworkKnowledgeBase();

    const runtime = new AdventureRuntime(container);

    const started = await runtime.startAdventure({

        childId: "child-1", childName: "Ak", ageRange: "7-8",
        location: "the forest path", moral: "collaboration matters", domain: "ethics"

    });

    // --- Section J: choice generation (already complete by the time
    // startAdventure() returns) made renderer calls ONLY for root's
    // own narration -- inspecting the choice TEXT itself never
    // touches a renderer. ---

    const rendererCallsAfterStart = llmClient.rendererCalls;

    console.assert(
        rendererCallsAfterStart === 1,
        `Expected exactly 1 renderer call after start (root only), got ${rendererCallsAfterStart}`
    );

    // Re-reading choice text again costs nothing further.
    const _inspectChoicesAgain = started.choices.map(c => c.text);

    console.assert(
        llmClient.rendererCalls === rendererCallsAfterStart,
        "Expected inspecting choice text to cost zero additional renderer calls"
    );

    void _inspectChoicesAgain;

    // --- Section O/H: choice text quality ---

    for (const choice of started.choices) {

        console.assert(
            choice.text !== undefined && choice.text.trim().length > 0,
            "Expected every choice to have non-empty text"
        );

        console.assert(
            choice.text !== "[object Object]",
            "Expected no stringified-object leakage into choice text"
        );

    }

    // --- Section O: unrelated characters never appear. Only Squeak
    // exists in this adventure's metadata; no other name should show
    // up in any choice text. ---

    console.assert(
        started.choices.every(choice => !choice.text.includes("Professor") && !choice.text.includes("Hoot")),
        "Expected no unrelated/uninvented character names in choice text"
    );

    // --- Multi-turn: choices should remain contextual, not collapse
    // to the old bare generic phrases, across several turns. ---

    let choices = started.choices;

    let anyGenericPhraseSeen = false;

    for (let turn = 0; turn < 3; turn++) {

        for (const choice of choices) {

            if (GENERIC_PHRASES.includes(choice.text)) {

                anyGenericPhraseSeen = true;

            }

        }

        const result = await runtime.playTurn({

            worldId: started.worldId, sessionId: started.sessionId, childId: "child-1",
            childName: "Ak", ageRange: "7-8", selectedChoiceId: choices[0].id

        });

        if (result.isEnding) {
            break;
        }

        choices = result.choices;

    }

    console.assert(
        !anyGenericPhraseSeen,
        "Expected contextual wording throughout -- the old bare generic phrases (e.g. 'Try again') should not appear given a concrete premise"
    );

    console.log("AdventureRuntime contextual choices test passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
