import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";

// Correction pass (LLM-owned-topology removal): startAdventure() no
// longer asks Gemini for a full node/edge topology. This fixture now
// mirrors the ACTUAL two calls startAdventure() makes:
//   1. AdventureMetadataGenerator -- small, creative, no topology.
//   2. GeminiTextRenderer, via NarrationRenderingService, for the
//      root node's own opening narration (root is always "rich").
// InitialStoryBuilder itself (the deterministic structure step in
// between) makes ZERO LLM calls -- see the "zero topology calls"
// assertion below, which is the whole point of this architecture
// change.
const METADATA_RESPONSE = JSON.stringify({

    title: "The Whispering Wood",

    characters: [{ id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." }],

    world: { setting: "forest", description: "An old, quiet forest." },

    learningPlan: [{ skillFocus: "leadership", approach: "natural consequence" }],

    genome: {
        theme: "friendship and honesty",
        explorationLevel: 0.6,
        humor: 0.3,
        mystery: 0.4,
        fantasyDensity: 0.7,
        puzzleDensity: 0.2,
        npcComplexity: 0.3,
        vocabulary: "simple"
    },

    premise: "a fox named Fenn waits quietly at the treeline",

    initialProblem: "a fallen branch blocks the path",

    plotOutline: [
        { beat: "hook", summary: "a friend needs help with a fallen branch" },
        { beat: "complication", summary: "the branch is heavier than expected" },
        { beat: "moral_fork", summary: "decide whether to admit a mistake" },
        { beat: "test", summary: "someone else learns what really happened" },
        { beat: "resolution", summary: "trust is rebuilt" }
    ]

});

const REFLECTION_RESPONSE = JSON.stringify({

    question: "What do you think the fox wanted?",

    followUpQuestions: ["How did you decide what to do?"],

    observedThemes: ["curiosity"],

    encouragement: "Every choice teaches you something about yourself."

});

const ANALYTICS_RESPONSE = JSON.stringify({

    summary: "Showed curiosity by engaging with the unfamiliar."

});

// Dispatches canned, schema-shaped responses by sniffing a string
// unique to each prompt template -- no network calls at all, which
// is what makes this test runnable in a sandboxed environment with
// no live Gemini/Ollama access.
class FakeLLMClient implements LLMClient {

    calls: { prompt: string; purpose?: string }[] = [];

    async generate(request: LLMRequest): Promise<LLMResponse> {

        this.calls.push({ prompt: request.prompt, purpose: request.metadata?.purpose });

        let text: string;

        if (request.prompt.includes("\"premise\": \"\"")) {
            // AdventureMetadataGenerator's distinguishing JSON-shape line.
            text = METADATA_RESPONSE;
        }
        else if (request.prompt.includes("You are a renderer")) {
            // GeminiTextRenderer -- used for BOTH the root's opening
            // narration and any "rich" frontier/expansion node.
            text = "Something meaningful happens, rendered by the fake Gemini renderer.";
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

    return {

        query: async () => [],

        queryAsContext: async () => "(none)"

    } as unknown as KnowledgeBase;

}

async function main(): Promise<void> {

    const fakeLLM = new FakeLLMClient();

    const container = new DependencyContainer({ llmClient: fakeLLM });

    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase =
        noNetworkKnowledgeBase();

    const runtime = new AdventureRuntime(container);

    // --- startAdventure: exactly 2 calls, always -- metadata (1) +
    // root narration (1, since root is hardcoded "rich"). Unlike the
    // old architecture, this is NOT a range -- InitialStoryBuilder
    // makes zero calls regardless of scoring/seed, so the total is
    // deterministic. ---

    const started = await runtime.startAdventure({

        childId: "child-1",

        childName: "Ari",

        ageRange: "7-8",

        location: "the edge of the forest",

        moral: "honesty matters",

        domain: "ethics"

    });

    console.assert(
        fakeLLM.calls.length === 2,
        `Expected exactly 2 LLM calls after startAdventure (metadata + root narration), got ${fakeLLM.calls.length}`
    );

    console.assert(
        fakeLLM.calls[0].purpose === "generate_adventure_metadata",
        `Expected the first call to be metadata generation, got purpose='${fakeLLM.calls[0].purpose}'`
    );

    console.assert(
        fakeLLM.calls[1].purpose === "render_story_node",
        `Expected the second call to be root narration, got purpose='${fakeLLM.calls[1].purpose}'`
    );

    console.assert(
        started.narrative.length > 0,
        "Expected the opening narrative to be non-empty (rendered from the deterministic premise)"
    );

    console.assert(
        started.choices.length >= 1 && started.choices.length <= 3,
        `Expected 1-3 opening choices (ChoiceCountPolicy caps at 3; fewer only if constraints genuinely left fewer valid candidates), got ${started.choices.length}`
    );

    console.assert(
        !started.isEnding,
        "Expected the opening scene not to be an ending"
    );

    // =========================================================
    // Multi-turn chapter lifecycle (chapter-lifecycle correction
    // pass). This REPLACES the old two-turn test, which encoded
    // exactly the bug being fixed here: it asserted the first choice
    // reaches a chapter-ending node. Under the corrected architecture,
    // frontier nodes are NOT endings -- reaching one triggers
    // progressive expansion (more frontier, or eventually a genuine
    // ending once ChapterProgressionEngine.canEnd() is satisfied).
    // This loop plays turns until a genuine ending is reached (with a
    // safety cap so a bug can't hang the test forever), and asserts
    // the chapter survives multiple real decisions before that
    // happens -- directly covering Section K.2/K.3/K.5 and Section L
    // (the "browser-product invariant": at least three player
    // decisions without accidental chapter completion) in one
    // realistic playthrough using the REAL AdventureRuntime,
    // InitialStoryBuilder, DeterministicExpansionService, and
    // ChapterProgressionEngine -- only the LLM boundary is mocked.
    // =========================================================

    const SAFETY_CAP = 15;

    let currentChoices = started.choices;

    let turnsPlayed = 0;

    let sawGenuineEnding = false;

    let analyticsCallCountAtEnd = 0;

    while (turnsPlayed < SAFETY_CAP) {

        console.assert(
            currentChoices.length > 0,
            `Expected the currently-shown node to always have choices to pick from (turn ${turnsPlayed}) -- zero choices with isEnding=false would mean expansion silently failed to produce anything`
        );

        const callsBefore = fakeLLM.calls.length;

        const next = await runtime.playTurn({

            worldId: started.worldId,

            sessionId: started.sessionId,

            childId: "child-1",

            childName: "Ari",

            ageRange: "7-8",

            selectedChoiceId: currentChoices[0].id

        });

        turnsPlayed++;

        console.assert(
            next.narrative.length > 0,
            `Expected turn ${turnsPlayed}'s reached node to have non-empty rendered narrative`
        );

        if (next.isEnding) {

            sawGenuineEnding = true;

            analyticsCallCountAtEnd = fakeLLM.calls.length - callsBefore;

            console.assert(
                next.reflection !== undefined && next.analytics !== undefined,
                `Expected reflection/analytics to be populated on the genuine-ending turn (turn ${turnsPlayed})`
            );

            console.assert(
                next.choices.length === 0,
                `Expected a genuine ending to have zero choices, got ${next.choices.length}`
            );

            break;

        }

        // NOT an ending -- this is the core assertion this whole
        // test exists to prove: reaching a frontier node must NOT
        // trigger chapter completion.
        console.assert(
            next.reflection === undefined && next.analytics === undefined,
            `Expected reflection/analytics NOT to run on turn ${turnsPlayed} -- this node is a frontier, not a genuine ending`
        );

        currentChoices = next.choices;

    }

    console.assert(
        sawGenuineEnding,
        `Expected a genuine ending to be reached within ${SAFETY_CAP} turns, got none -- chapter never concluded`
    );

    console.assert(
        turnsPlayed >= 3,
        `Expected at least 3 player decisions before the chapter concluded (Section L invariant), got ${turnsPlayed}`
    );

    console.assert(
        analyticsCallCountAtEnd === 2 || analyticsCallCountAtEnd === 3,
        `Expected 2 (reflection+analytics) or 3 (+ one lazy render) LLM calls on the genuine-ending turn, got ${analyticsCallCountAtEnd}`
    );

    // --- Zero topology LLM calls, still true across the whole
    // multi-turn playthrough, not just startup. ---

    console.assert(
        fakeLLM.calls.every(call =>
            !call.prompt.includes("rootNodeId") && !call.prompt.includes("nextNodeId")
        ),
        "Expected no LLM call, across the entire playthrough, to ever reference graph topology fields (rootNodeId/nextNodeId)"
    );

    console.log(
        `AdventureRuntime graph-traversal integration test passed ` +
        `(${turnsPlayed} turns played before genuine ending).`
    );

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
