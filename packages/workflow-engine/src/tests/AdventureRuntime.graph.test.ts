import { DependencyContainer, AdventureRuntime } from "../index";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";
import { KnowledgeBase } from "@storyforge/knowledge-engine";

// A tiny, structurally-valid 3-node graph: root -> mid -> ending.
// Small on purpose (the real prompt's schema asks Gemini for 10-16
// nodes, but that minimum lives in the responseSchema passed to the
// provider, not in this codebase's own post-parse validation -- see
// AdventureBlueprintGenerator.validateShape / GraphValidator, which
// only require structural soundness, not a node count). Deliberately
// small enough that EXPANSION_THRESHOLD (3) triggers on the very
// first turn, so this test exercises both traversal and expansion.
const BLUEPRINT_RESPONSE = JSON.stringify({

    title: "The Whispering Wood",

    characters: [{ id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." }],

    world: { setting: "forest", description: "An old, quiet forest." },

    learningPlan: [{ skillFocus: "honesty", approach: "natural consequence" }],

    emotionCurve: [{ label: "opening", excitement: 0.5, tension: 0.2 }],

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

    rootNodeId: "root",

    nodes: [

        {
            id: "root",
            narrative: "You find a fox waiting at the treeline.",
            choices: [
                { id: "a", text: "Follow the fox", nextNodeId: "mid" },
                { id: "b", text: "Wave hello", nextNodeId: "mid" },
                { id: "c", text: "Sit and wait", nextNodeId: "mid" },
                { id: "d", text: "Call out a name", nextNodeId: "mid" }
            ],
            learningSignals: ["curiosity"],
            emotion: { excitement: 0.6, curiosity: 0.7, confidence: 0, fear: 0, wonder: 0.4, frustration: 0, pride: 0, calm: 0 },
            effects: [],
            difficulty: 1,
            readingLevel: "beginner",
            isEnding: false
        },

        {
            id: "mid",
            narrative: "The fox leads you to a fork in the path.",
            choices: [
                { id: "e", text: "Take the left path", nextNodeId: "ending" },
                { id: "f", text: "Take the right path", nextNodeId: "ending" },
                { id: "g", text: "Ask the fox which way", nextNodeId: "ending" },
                { id: "h", text: "Turn back", nextNodeId: "ending" }
            ],
            learningSignals: [],
            emotion: { excitement: 0.3, curiosity: 0.5, confidence: 0, fear: 0.1, wonder: 0.2, frustration: 0, pride: 0, calm: 0 },
            effects: [
                { type: "flag.set", payload: { key: "metFox", value: true } }
            ],
            difficulty: 1,
            readingLevel: "beginner",
            isEnding: false,
            eventType: "asked_questions"
        },

        {
            id: "ending",
            narrative: "You reach a clearing bathed in golden light. The adventure's first chapter closes.",
            choices: [],
            learningSignals: [],
            emotion: { excitement: 0.2, curiosity: 0, confidence: 0.4, fear: 0, wonder: 0.3, frustration: 0, pride: 0.5, calm: 0.6 },
            effects: [],
            difficulty: 1,
            readingLevel: "beginner",
            isEnding: true,
            endingType: "quiet-victory"
        }

    ]

});

const EXPANSION_RESPONSE = JSON.stringify({

    entryChoices: [
        { id: "x", text: "Explore the glowing cave", nextNodeId: "ch-node1" },
        { id: "y", text: "Return to the village", nextNodeId: "ch-node1" },
        { id: "z", text: "Ask Fenn for advice", nextNodeId: "ch-node1" },
        { id: "w", text: "Rest a while", nextNodeId: "ch-node1" }
    ],

    nodes: [
        {
            id: "ch-node1",
            narrative: "A new path opens before you.",
            choices: [],
            learningSignals: [],
            emotion: { excitement: 0.5, curiosity: 0.5, confidence: 0, fear: 0, wonder: 0.5, frustration: 0, pride: 0, calm: 0 },
            effects: [],
            difficulty: 1,
            readingLevel: "beginner",
            isEnding: true,
            endingType: "cliffhanger",
            eventType: "explored"
        }
    ]

});

const REFLECTION_RESPONSE = JSON.stringify({

    question: "What do you think the fox wanted?",

    followUpQuestions: ["How did you decide what to do?"],

    observedThemes: ["curiosity"],

    encouragement: "Every choice teaches you something about yourself."

});

const ANALYTICS_RESPONSE = JSON.stringify({

    summary: "Showed curiosity by asking questions and exploring the new path."

});

// Dispatches canned, schema-shaped responses by sniffing a string
// unique to each prompt template -- no network calls at all, which
// is what makes this test runnable in a sandboxed environment with
// no live Gemini/Ollama access.
class FakeLLMClient implements LLMClient {

    calls: { prompt: string }[] = [];

    async generate(request: LLMRequest): Promise<LLMResponse> {

        this.calls.push({ prompt: request.prompt });

        let text: string;

        if (request.prompt.includes("entryChoices")) {
            text = EXPANSION_RESPONSE;
        }
        else if (request.prompt.includes("Adventure Architect")) {
            text = BLUEPRINT_RESPONSE;
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

    // No live Ollama server exists in this environment -- the
    // embedding-backed knowledge base isn't what this test is
    // verifying, so it's swapped for a network-free fake.
    (container as unknown as { knowledgeBase: KnowledgeBase }).knowledgeBase =
        noNetworkKnowledgeBase();

    const runtime = new AdventureRuntime(container);

    // --- startAdventure: exactly one AI call (the blueprint) ---

    const started = await runtime.startAdventure({

        childId: "child-1",

        childName: "Ari",

        ageRange: "7-8",

        location: "the edge of the forest",

        moral: "honesty matters",

        domain: "ethics"

    });

    console.assert(
        fakeLLM.calls.length === 1,
        `Expected exactly 1 LLM call after startAdventure, got ${fakeLLM.calls.length}`
    );

    console.assert(
        started.narrative.includes("fox waiting"),
        "Expected the opening narrative to come from the pre-generated root node"
    );

    console.assert(
        started.choices.length === 4,
        `Expected 4 opening choices, got ${started.choices.length}`
    );

    console.assert(
        !started.isEnding,
        "Expected the opening scene not to be an ending"
    );

    // --- playTurn 1: root -> mid. Pure traversal (no blueprint/expansion
    // call), but Reflection + Analytics still run (unchanged this phase)
    // ---

    const callsBeforeTurn1 = fakeLLM.calls.length;

    const turn1 = await runtime.playTurn({

        worldId: started.worldId,

        sessionId: started.sessionId,

        childId: "child-1",

        childName: "Ari",

        ageRange: "7-8",

        selectedChoiceId: "a"

    });

    const turn1Calls = fakeLLM.calls.length - callsBeforeTurn1;

    // Because this tiny 3-node graph has only 1 non-ending node
    // ("mid") reachable ahead of "mid" itself once we arrive there,
    // EXPANSION_THRESHOLD (3) is crossed immediately, so this turn
    // makes exactly 1 call: the expansion generation. "mid" is NOT
    // an ending, so Reflection/Analytics do NOT run here (Part 3/4:
    // they only run at chapter end) -- zero calls for
    // narrative/choices themselves either way, which came from the
    // pre-generated node.
    console.assert(
        turn1Calls === 1,
        `Expected exactly 1 LLM call on turn 1 (expansion only, no reflection/analytics on a non-ending turn), got ${turn1Calls}`
    );

    console.assert(
        turn1.narrative.includes("fork in the path"),
        "Expected turn 1's narrative to come from the pre-generated 'mid' node"
    );

    console.assert(
        turn1.worldUpdate.effects.some(e => e.type === "flag.set"),
        "Expected the 'mid' node's flag.set effect to have been applied"
    );

    console.assert(
        turn1.reflection === undefined && turn1.analytics === undefined,
        "Expected reflection/analytics to be undefined on a non-chapter-ending turn"
    );

    // --- playTurn 2: mid -> ending. The 'mid' node's choices were
    // entirely REPLACED by expansion during turn 1 (its old e/f/g/h
    // choices are gone -- that's the intended behavior of converting
    // an ending into a junction), so this turn selects one of the
    // new entryChoices ('x'/'y'/'z'/'w') instead.
    // ---

    const callsBeforeTurn2 = fakeLLM.calls.length;

    const turn2 = await runtime.playTurn({

        worldId: started.worldId,

        sessionId: started.sessionId,

        childId: "child-1",

        childName: "Ari",

        ageRange: "7-8",

        selectedChoiceId: "x"

    });

    const turn2Calls = fakeLLM.calls.length - callsBeforeTurn2;

    // 'ch-node1' IS an ending (chapter end), so Reflection + the
    // Analytics explanation run here -- exactly 2 calls, and no
    // expansion (the maybeExpandGraph check is skipped entirely for
    // ending nodes).
    console.assert(
        turn2Calls === 2,
        `Expected exactly 2 LLM calls on turn 2 (reflection + analytics explanation, no expansion), got ${turn2Calls}`
    );

    console.assert(
        turn2.isEnding,
        "Expected turn 2 to land on an ending node"
    );

    console.assert(
        turn2.narrative.includes("new path opens"),
        "Expected turn 2's narrative to come from the expanded subtree's node"
    );

    console.assert(
        turn2.reflection !== undefined && turn2.analytics !== undefined,
        "Expected reflection/analytics to be populated on the chapter-ending turn"
    );

    // The two events recorded so far ("asked_questions" from 'mid',
    // "explored" from 'ch-node1') should have been scored
    // deterministically -- verifying the actual math ran, not just
    // that the LLM explanation call happened.
    console.assert(
        turn2.analytics!.skillSignals.some(s => s.skill === "curiosity"),
        `Expected a deterministically-scored 'curiosity' signal from the recorded events, got: ${JSON.stringify(turn2.analytics!.skillSignals)}`
    );

    console.assert(
        turn2.analytics!.summary === "Showed curiosity by asking questions and exploring the new path.",
        "Expected the analytics summary to be exactly what the (fake) LLM explanation returned, unmodified"
    );

    console.log("AdventureRuntime graph-traversal integration test passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
