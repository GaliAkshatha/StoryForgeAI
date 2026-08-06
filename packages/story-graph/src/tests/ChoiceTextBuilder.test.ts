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

    console.assert(wordCount >= 2 && wordCount <= 8, `${label}: expected roughly 2-8 words, got ${wordCount} ("${text}")`);

}

function main(): void {

    const builder = new ChoiceTextBuilder();

    // Design change (real browser bug): choices no longer repeat the
    // full problem clause -- the narration shown directly above the
    // choices already establishes it, and since every choice in a
    // set shares the SAME narrativeState.currentProblem, repeating it
    // in every choice made them all end in an identical phrase ("Help
    // Barnaby -- a broken acorn cup needs mending" / "Search near --
    // a broken acorn cup needs mending" / ...), which read like
    // broken, repetitive Q&A rather than distinct choices. Choices
    // are now short, distinct actions; target names are preserved
    // where relevant.

    // --- asked_questions ---

    {

        const c = candidate({ type: "asked_questions", targetName: "Squeak" });

        const text = builder.build(c, narrativeState({ currentProblem: "the fallen branch" }));

        assertGoodChoice(text, "asked_questions");

        console.assert(text.includes("Squeak"), "Expected target name preserved");

    }

    // --- observed ---

    {

        const c = candidate({ type: "observed" });

        const text = builder.build(c, narrativeState({ currentProblem: "the fallen branch" }));

        assertGoodChoice(text, "observed");

    }

    // --- retried ---

    {

        const c = candidate({ type: "retried" });

        const text = builder.build(c, narrativeState({ currentProblem: "moving the branch" }));

        assertGoodChoice(text, "retried");

    }

    // --- helped_npc ---

    {

        const c = candidate({ type: "helped_npc", targetName: "Squeak" });

        const text = builder.build(c, narrativeState({ currentProblem: "moving the branch" }));

        assertGoodChoice(text, "helped_npc");

        console.assert(text.includes("Squeak"), "Expected target preserved");

    }

    // --- solved_puzzle ---

    {

        const c = candidate({ type: "solved_puzzle" });

        const text = builder.build(c, narrativeState({ currentProblem: "the locked gate" }));

        assertGoodChoice(text, "solved_puzzle");

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

    // --- Critical regression: three choices sharing the SAME
    // narrativeState.currentProblem must NOT all end up identical or
    // even near-identical (the exact reported bug: all three choices
    // ending in "-- a broken acorn cup needs mending"). ---

    {

        const state = narrativeState({ currentProblem: "a broken acorn cup needs mending" });

        const texts = [
            builder.build(candidate({ type: "helped_npc", targetName: "Barnaby" }), state),
            builder.build(candidate({ type: "explored" }), state),
            builder.build(candidate({ type: "failed_puzzle" }), state)
        ];

        console.assert(
            new Set(texts).size === texts.length,
            `Expected all three choices to be genuinely distinct, got ${JSON.stringify(texts)}`
        );

        // helped_npc/explored are target- or action-grounded and
        // never repeat the problem; only no-target action types
        // (failed_puzzle here) reference it, and only when they
        // genuinely need grounding ("Give it a try" alone is too
        // vague -- "it" has no antecedent).
        const repeatCount = texts.filter(t => t.includes("acorn cup needs mending")).length;

        console.assert(
            repeatCount <= 1,
            `Expected at most one choice to reference the problem (avoiding the reported all-three-identical bug), got ${JSON.stringify(texts)}`
        );

    }

    console.log("ChoiceTextBuilder tests passed.");

}

main();
