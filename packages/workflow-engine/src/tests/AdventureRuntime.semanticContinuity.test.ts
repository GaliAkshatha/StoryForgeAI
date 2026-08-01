import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";

// Phase 2A (Section J): plays several turns through the REAL
// deterministic pipeline (InitialStoryBuilder, DeterministicExpansionService,
// ChapterProgressionEngine, NarrativeStateTransition -- only the LLM
// boundary is mocked) and checks semantic continuity INVARIANTS every
// turn, rather than asserting one specific hand-picked event sequence
// (which would be fragile against legitimate scoring changes).

const METADATA_RESPONSE = JSON.stringify({

    title: "The Whispering Wood",

    characters: [
        { id: "squeak", name: "Squeak", role: "friend", description: "A small mouse." },
        { id: "owl", name: "Orla", role: "mentor", description: "A wise owl." }
    ],

    world: { setting: "forest", description: "An old, quiet forest." },

    learningPlan: [{ skillFocus: "collaboration", approach: "natural consequence" }],

    genome: {
        theme: "friendship", explorationLevel: 0.5, humor: 0.2, mystery: 0.3,
        fantasyDensity: 0.6, puzzleDensity: 0.2, npcComplexity: 0.3, vocabulary: "simple"
    },

    premise: "Squeak looks worried near a fallen branch blocking the path"

});

class FakeLLMClient implements LLMClient {

    async generate(request: LLMRequest): Promise<LLMResponse> {

        if (request.prompt.includes("\"premise\": \"\"")) {
            return { text: METADATA_RESPONSE, model: "fake-model", finishReason: "STOP" };
        }

        if (request.prompt.includes("You are a renderer")) {
            return { text: "Something happens.", model: "fake-model", finishReason: "STOP" };
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

        throw new Error(`FakeLLMClient: unexpected prompt: ${request.prompt.slice(0, 80)}...`);

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

        childId: "child-1", childName: "Ari", ageRange: "7-8",
        location: "the edge of the forest", moral: "collaboration matters", domain: "ethics"

    });

    // Root's own narrativeState should already have a valid location
    // and (given the premise) a currentProblem -- verified via a
    // fresh WorldState fetch, the same repository path AdventureRuntime uses.
    let worldState = await container.worldStateStore.get(started.worldId);

    console.assert(
        worldState?.narrativeState !== undefined,
        "Expected narrativeState to be seeded at adventure start"
    );

    console.assert(
        !!worldState!.narrativeState!.location,
        "Expected a non-empty current location from turn 0"
    );

    console.assert(
        worldState!.narrativeState!.activeCharacterIds.length > 0,
        "Expected at least one character established by adventure start"
    );

    let choices = started.choices;

    const MIN_TURNS = 4;

    let turnsPlayed = 0;

    let previousActiveCount = worldState!.narrativeState!.activeCharacterIds.length;

    while (turnsPlayed < MIN_TURNS) {

        console.assert(choices.length > 0, `Expected available choices at turn ${turnsPlayed}`);

        const turn = await runtime.playTurn({

            worldId: started.worldId, sessionId: started.sessionId, childId: "child-1",
            childName: "Ari", ageRange: "7-8", selectedChoiceId: choices[0].id

        });

        turnsPlayed++;

        worldState = await container.worldStateStore.get(started.worldId);

        const narrativeState = worldState!.narrativeState!;

        // Every turn: location remains valid (non-empty), active
        // character roster never shrinks (characters, once
        // established, stay established), and the state is
        // internally consistent (bounded arrays stay bounded).
        console.assert(
            !!narrativeState.location,
            `Expected a valid non-empty location after turn ${turnsPlayed}`
        );

        console.assert(
            narrativeState.activeCharacterIds.length >= previousActiveCount,
            `Expected the active character roster to never shrink (turn ${turnsPlayed})`
        );

        console.assert(
            narrativeState.establishedFacts.length <= 8 &&
            narrativeState.unresolvedThreads.length <= 5 &&
            narrativeState.recentEventTypes.length <= 5,
            `Expected all bounded NarrativeState arrays to stay within their limits after turn ${turnsPlayed}`
        );

        previousActiveCount = narrativeState.activeCharacterIds.length;

        if (turn.isEnding) {
            break;
        }

        console.assert(
            turn.choices.length > 0,
            `Expected the reached (non-ending) node to have choices after turn ${turnsPlayed}`
        );

        choices = turn.choices;

    }

    console.assert(
        turnsPlayed >= MIN_TURNS,
        `Expected at least ${MIN_TURNS} turns to be playable, got ${turnsPlayed}`
    );

    console.log(`AdventureRuntime semantic continuity test passed (${turnsPlayed} turns).`);

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
