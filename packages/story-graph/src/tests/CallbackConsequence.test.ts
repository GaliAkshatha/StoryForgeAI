import { SemanticEventBuilder } from "../services/SemanticEventBuilder";
import { NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent } from "../models/CandidateEvent";

// The pedagogical fix: the "test" beat should visibly reference what
// was established earlier (what the child effectively chose at the
// moral_fork), not just narrate a generic event. This is what makes
// "your choice mattered" structurally true in the story, not merely
// implied by the plot outline's labels.

function candidate(overrides: Partial<CandidateEvent>): CandidateEvent {

    return {
        id: "c1", type: "retried", prerequisites: [], effects: [],
        learningTags: [], emotionalEffects: {}, relationshipEffects: [],
        narrativeSeed: "does something", complexity: "trivial", isEnding: true,
        ...overrides
    };

}

function baseState(overrides: Partial<NarrativeState> = {}): NarrativeState {

    return {
        location: "the wood", activeCharacterIds: ["squeak"], currentGoal: "help",
        currentProblem: "a fallen branch", establishedFacts: [], unresolvedThreads: [],
        recentEventTypes: [],
        plotOutline: [
            { beat: "hook", summary: "a friend needs help" },
            { beat: "complication", summary: "it gets harder" },
            { beat: "moral_fork", summary: "decide whether to tell the truth" },
            { beat: "test", summary: "someone learns what really happened" },
            { beat: "resolution", summary: "trust is rebuilt" }
        ],
        currentBeatIndex: 0,
        ...overrides
    };

}

function main(): void {

    const builder = new SemanticEventBuilder();

    // --- At the test beat, with a prior established fact, the
    // consequence must reference it explicitly. ---

    {

        const state = baseState({
            currentBeatIndex: 3, // "test"
            establishedFacts: ["Ak told Grandma the berries were stolen"]
        });

        const event = builder.build({
            candidate: candidate({}), actorName: "Ak", ageRange: "7-8", narrativeState: state
        });

        console.assert(
            event.consequence.toLowerCase().includes("ak told grandma") ||
            event.consequence.includes("Because"),
            `Expected the test-beat consequence to callback to the prior established fact, got '${event.consequence}'`
        );

    }

    // --- NOT at the test beat: no callback, even with facts present
    // -- proves this is beat-conditional, not always-on. ---

    {

        const state = baseState({
            currentBeatIndex: 1, // "complication"
            establishedFacts: ["Ak told Grandma the berries were stolen"]
        });

        const event = builder.build({
            candidate: candidate({}), actorName: "Ak", ageRange: "7-8", narrativeState: state
        });

        console.assert(
            !event.consequence.startsWith("Because"),
            `Expected NO callback outside the test beat, got '${event.consequence}'`
        );

    }

    // --- Test beat but NO established facts yet: must not crash or
    // produce "Because undefined, ...". ---

    {

        const state = baseState({ currentBeatIndex: 3, establishedFacts: [] });

        const event = builder.build({
            candidate: candidate({}), actorName: "Ak", ageRange: "7-8", narrativeState: state
        });

        console.assert(
            !event.consequence.includes("undefined"),
            `Expected a safe fallback with no facts to callback to, got '${event.consequence}'`
        );

    }

    console.log("Callback consequence tests passed.");

}

main();
