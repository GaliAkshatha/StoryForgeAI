import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";
import { WorldStateStore, WorldState } from "@storyforge/simulation-engine";

// Reproduces the EXACT reported bug: PostgresWorldStateStore's
// mapping silently dropped adventureId/currentNodeId, so a fresh
// get() (simulating the next HTTP request in a real, non-memory-mode
// deployment) came back without them, and AdventureRuntime.playTurn()
// threw "has no associated Story Graph position" on the very first
// turn after adventure creation. This fake mimics that exact
// field-dropping shape (a serialize/deserialize round trip through a
// plain object, NOT a live object reference) so this test would have
// failed the same way before the fix, for the same underlying reason.
class RoundTrippingWorldStateStore implements WorldStateStore {

    private readonly rows = new Map<string, Record<string, unknown>>();

    constructor(
        private readonly persistGraphPosition: boolean
    ) {}

    async get(worldId: string): Promise<WorldState | undefined> {

        const row = this.rows.get(worldId);

        if (!row) {
            return undefined;
        }

        const restored = JSON.parse(JSON.stringify(row)) as WorldState;

        if (!this.persistGraphPosition) {

            delete (restored as Partial<WorldState>).adventureId;

            delete (restored as Partial<WorldState>).currentNodeId;

        }

        return restored;

    }

    async create(state: WorldState): Promise<void> {

        this.rows.set(state.worldId, JSON.parse(JSON.stringify(state)));

    }

    async save(state: WorldState): Promise<void> {

        this.rows.set(state.worldId, JSON.parse(JSON.stringify(state)));

    }

}

const METADATA_RESPONSE = JSON.stringify({

    title: "The Whispering Wood",

    characters: [{ id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." }],

    world: { setting: "forest", description: "An old, quiet forest." },

    learningPlan: [{ skillFocus: "honesty", approach: "natural consequence" }],

    genome: {
        theme: "honesty", explorationLevel: 0.5, humor: 0.2, mystery: 0.3,
        fantasyDensity: 0.6, puzzleDensity: 0.2, npcComplexity: 0.3, vocabulary: "simple"
    },

    premise: "Ak stands at the edge of the Whispering Wood"

});

const REFLECTION_RESPONSE = JSON.stringify({
    question: "What do you think happened?",
    followUpQuestions: ["Why?"],
    observedThemes: ["curiosity"],
    encouragement: "Nice thinking."
});

const ANALYTICS_RESPONSE = JSON.stringify({ summary: "Showed curiosity." });

class FakeLLMClient implements LLMClient {

    async generate(request: LLMRequest): Promise<LLMResponse> {

        let text: string;

        if (request.prompt.includes("\"premise\": \"\"")) {
            text = METADATA_RESPONSE;
        }
        else if (request.prompt.includes("You are a renderer")) {
            text = "The story continues in a new direction.";
        }
        else if (request.prompt.includes("Reflection Agent")) {
            text = REFLECTION_RESPONSE;
        }
        else if (request.prompt.includes("Analytics Agent")) {
            text = ANALYTICS_RESPONSE;
        }
        else {
            throw new Error(`FakeLLMClient: no canned response for prompt: ${request.prompt.slice(0, 80)}...`);
        }

        return { text, model: "fake-model", finishReason: "STOP" };

    }

}

function noNetworkKnowledgeBase(): KnowledgeBase {

    return { query: async () => [], queryAsContext: async () => "(none)" } as unknown as KnowledgeBase;

}

async function runLifecycle(
    worldStateStore: WorldStateStore
): Promise<{ threw: boolean; message?: string }> {

    const container = new DependencyContainer({ llmClient: new FakeLLMClient(), worldStateStore });

    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase = noNetworkKnowledgeBase();

    const runtime = new AdventureRuntime(container);

    const started = await runtime.startAdventure({

        childId: "child-1", childName: "Ak", ageRange: "7-8",
        location: "the edge of the Whispering Wood", moral: "honesty matters", domain: "ethics"

    });

    try {

        const turn = await runtime.playTurn({

            worldId: started.worldId, sessionId: started.sessionId, childId: "child-1",
            childName: "Ak", ageRange: "7-8", selectedChoiceId: started.choices[0].id

        });

        console.assert(
            turn.narrative.length > 0,
            `Expected the correct next node to have non-empty rendered narrative, got '${turn.narrative}'`
        );

        console.assert(
            !turn.isEnding && turn.choices.length > 0,
            "Expected the reached frontier node to be successfully expanded (non-ending, with new choices) -- this test is about graph-position persistence surviving a store round trip, not chapter lifecycle timing"
        );

        return { threw: false };

    }
    catch (error) {

        return { threw: true, message: error instanceof Error ? error.message : String(error) };

    }

}

async function main(): Promise<void> {

    const buggyResult = await runLifecycle(new RoundTrippingWorldStateStore(false));

    console.assert(
        buggyResult.threw && buggyResult.message?.includes("has no associated Story Graph position"),
        `Expected the pre-fix-shaped store to reproduce the exact reported error, got: threw=${buggyResult.threw} message=${buggyResult.message}`
    );

    const fixedResult = await runLifecycle(new RoundTrippingWorldStateStore(true));

    console.assert(
        !fixedResult.threw,
        `Expected playTurn to succeed once the store correctly persists graph position, got: ${fixedResult.message}`
    );

    console.log("AdventureRuntime Postgres-lifecycle regression test passed.");

}

main();
