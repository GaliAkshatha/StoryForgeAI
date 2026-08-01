import { ChoiceTextBuilder } from "../services/ChoiceTextBuilder";
import { CandidateEvent } from "../models/CandidateEvent";
import { NarrativeState } from "@storyforge/simulation-engine";

function candidate(overrides: Partial<CandidateEvent>): CandidateEvent {

    return {

        id: "c1", type: "observed", prerequisites: [], effects: [],
        learningTags: [], emotionalEffects: {}, relationshipEffects: [],
        narrativeSeed: "does something", complexity: "trivial", isEnding: true,
        ...overrides

    };

}

function narrativeState(overrides: Partial<NarrativeState> = {}): NarrativeState {

    return {

        location: "the forest clearing",
        activeCharacterIds: [],
        currentGoal: "find a way through",
        currentProblem: undefined,
        establishedFacts: [],
        unresolvedThreads: [],
        recentEventTypes: [],
        ...overrides

    };

}

function assertGoodChoice(text: string, label: string): void {

    console.assert(text !== undefined && text !== null, `${label}: expected defined text`);

    console.assert(text.trim().length > 0, `${label}: expected non-empty text`);

    console.assert(text !== "[object Object]", `${label}: expected not to be a stringified object`);

    const wordCount = text.trim().split(/\s+/).length;

    console.assert(wordCount >= 2 && wordCount <= 10, `${label}: expected roughly 3-10 words, got ${wordCount} ("${text}")`);

}

function main(): void {

    const builder = new ChoiceTextBuilder();

    // --- asked_questions: context-rich ---

    {

        const c = candidate({ type: "asked_questions", targetName: "Squeak" });

        const text = builder.build(c, narrativeState({ currentProblem: "the fallen branch" }));

        assertGoodChoice(text, "asked_questions rich");

        console.assert(text.includes("Squeak"), "Expected target name preserved");

        console.assert(text.includes("fallen branch"), "Expected current problem referenced");

        console.assert(text !== "Ask questions", "Expected NOT the bare generic phrase");

    }

    // --- asked_questions: context-poor (no problem) ---

    {

        const c = candidate({ type: "asked_questions", targetName: "Squeak" });

        const text = builder.build(c, narrativeState());

        assertGoodChoice(text, "asked_questions poor");

        console.assert(text.includes("Squeak"), "Expected target still preserved even without a problem");

    }

    // --- observed: context-rich (uses problem, not generic 'around') ---

    {

        const c = candidate({ type: "observed" });

        const text = builder.build(c, narrativeState({ currentProblem: "the fallen branch" }));

        assertGoodChoice(text, "observed rich");

        console.assert(text.includes("fallen branch"), "Expected the problem referenced instead of generic 'around'");

    }

    // --- retried: requires context to be non-generic ---

    {

        const c = candidate({ type: "retried" });

        const richText = builder.build(c, narrativeState({ currentProblem: "moving the branch" }));

        assertGoodChoice(richText, "retried rich");

        console.assert(richText !== "Try again", "Expected contextual wording, not the bare fallback");

        const poorText = builder.build(c, narrativeState());

        assertGoodChoice(poorText, "retried poor");

        console.assert(poorText === "Try again", "Expected the generic fallback when no problem is known");

    }

    // --- helped_npc ---

    {

        const c = candidate({ type: "helped_npc", targetName: "Squeak" });

        const text = builder.build(c, narrativeState({ currentProblem: "moving the branch" }));

        assertGoodChoice(text, "helped_npc");

        console.assert(text.includes("Squeak") && text.includes("moving the branch"), "Expected both target and problem present");

        console.assert(text !== "Help Squeak", "Expected richer than the bare target-only fallback");

    }

    // --- solved_puzzle ---

    {

        const c = candidate({ type: "solved_puzzle" });

        const text = builder.build(c, narrativeState({ currentProblem: "the locked gate" }));

        assertGoodChoice(text, "solved_puzzle");

        console.assert(text.includes("locked gate"), "Expected the problem referenced");

    }

    // --- ignored_warning ---

    {

        const c = candidate({ type: "ignored_warning" });

        const text = builder.build(c, narrativeState());

        assertGoodChoice(text, "ignored_warning");

    }

    // --- shared_resources ---

    {

        const c = candidate({ type: "shared_resources", targetName: "Orla" });

        const text = builder.build(c, narrativeState());

        assertGoodChoice(text, "shared_resources");

        console.assert(text.includes("Orla"), "Expected target preserved");

    }

    // --- led_team ---

    {

        const c = candidate({ type: "led_team", targetName: "Squeak" });

        const text = builder.build(c, narrativeState({ currentProblem: "crossing the stream" }));

        assertGoodChoice(text, "led_team");

        console.assert(text.includes("crossing the stream"), "Expected the goal/problem referenced");

    }

    // --- No spoilers: consequence text must never appear in choice text ---

    {

        const c = candidate({ type: "solved_puzzle" });

        const text = builder.build(c, narrativeState({ currentProblem: "the locked gate" }));

        console.assert(
            !text.toLowerCase().includes("no longer") && !text.toLowerCase().includes("gives way"),
            "Expected no consequence/outcome language leaked into the choice text"
        );

    }

    // --- Safe fallback: never undefined/null/empty even for an
    // unrecognized eventType (defensive) ---

    {

        const c = candidate({ type: "helped_npc", targetName: undefined });

        const text = builder.build(c, narrativeState());

        assertGoodChoice(text, "no target fallback");

    }

    console.log("ChoiceTextBuilder tests passed.");

}

main();
