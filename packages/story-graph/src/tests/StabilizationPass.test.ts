import { InitialStoryBuilder } from "../services/InitialStoryBuilder";
import { DeterministicExpansionService } from "../services/DeterministicExpansionService";
import { CandidateEventGenerator } from "../services/CandidateEventGenerator";
import { ConstraintEngine } from "../services/ConstraintEngine";
import { EventScorer } from "../services/EventScorer";
import { MemoryRetrievalService } from "../services/MemoryRetrievalService";
import { SemanticEventBuilder } from "../services/SemanticEventBuilder";
import { ChoiceTextBuilder } from "../services/ChoiceTextBuilder";
import { TemplateTextRenderer } from "@storyforge/llm-client";
import { createInitialWorldState } from "@storyforge/simulation-engine";

function makeBuilder(): InitialStoryBuilder {

    return new InitialStoryBuilder(

        new DeterministicExpansionService(
            new CandidateEventGenerator(),
            new ConstraintEngine(),
            new EventScorer(),
            new MemoryRetrievalService(),
            new SemanticEventBuilder()
        )

    );

}

async function main(): Promise<void> {

    // =========================================================
    // Part 1 (CRITICAL): a premise shaped exactly like the reported
    // bug -- a character name+description sentence -- must NEVER
    // leak into choice text, because currentProblem is now seeded
    // from the distinct, short initialProblem field.
    // =========================================================

    {

        const worldState = createInitialWorldState({
            worldId: "w1", childId: "c1", location: "the Whispering Wood", moral: "honesty", domain: "ethics"
        });

        const result = await makeBuilder().build({

            adventureId: "adventure-1",

            worldState,

            characters: [{ id: "pip", name: "Pip", role: "friend", description: "A small bird" }],

            actorName: "Ak",

            ageRange: "7-8",

            domain: "ethics",

            skillFocus: ["collaboration"],

            location: "the Whispering Wood",

            // Exactly the reported bug's premise shape.
            premise: "A small bird named Pip is tearfully guarding an empty nest near the Whispering Wood",

            initialProblem: "the nest is empty",

            plotOutline: [
                { beat: "hook" as const, summary: "a bird is guarding something precious" },
                { beat: "complication" as const, summary: "the nest is found empty" },
                { beat: "moral_fork" as const, summary: "decide what to say about what happened" },
                { beat: "test" as const, summary: "the truth comes out another way" },
                { beat: "resolution" as const, summary: "the bird decides who to trust" }
            ]

        });

        console.assert(
            result.narrativeState.currentProblem === "the nest is empty",
            `Expected currentProblem to be the SHORT initialProblem, not the verbose premise, got '${result.narrativeState.currentProblem}'`
        );

        console.assert(
            !result.narrativeState.currentProblem?.includes("named Pip"),
            "Expected the character bio pattern ('named Pip') to NEVER appear in currentProblem"
        );

        // Utility AI architecture pass: activeProblem is the
        // structured source of truth now, not just a sanitized string.
        console.assert(
            result.narrativeState.activeProblem !== undefined,
            "Expected a structured activeProblem to be seeded"
        );

        console.assert(
            result.narrativeState.activeProblem!.status === "active" &&
            result.narrativeState.activeProblem!.participants.includes("pip") &&
            !result.narrativeState.activeProblem!.reason.includes("named Pip"),
            `Expected activeProblem to be well-formed structured data, got ${JSON.stringify(result.narrativeState.activeProblem)}`
        );

        // Every generated choice text must never contain the
        // character-bio fragment either.
        for (const choice of result.rootNode.choices) {

            console.assert(
                !choice.text.includes("named Pip") && !choice.text.includes("tearfully"),
                `Expected no character-bio fragment in choice text, got '${choice.text}'`
            );

            console.assert(
                choice.text.length > 0 && choice.text.length < 60,
                `Expected reasonably short choice text, got '${choice.text}' (${choice.text.length} chars)`
            );

        }

    }

    // =========================================================
    // Part 1: ChoiceTextBuilder in isolation, given a
    // description-shaped "problem" input directly (defensive --
    // proves the safety net holds even if some future caller passes
    // a verbose problem string again).
    // =========================================================

    {

        const builder = new ChoiceTextBuilder();

        const candidate = {

            id: "c1", type: "helped_npc" as const, targetName: "Pip",
            prerequisites: [], effects: [], learningTags: [], emotionalEffects: {},
            relationshipEffects: [], narrativeSeed: "helps Pip", complexity: "trivial" as const, isEnding: true

        };

        const text = builder.build(candidate, {

            location: "the wood", activeCharacterIds: ["pip"], currentGoal: "help",
            currentProblem: "A small bird named Pip is tearfully guarding an empty nest near the Whispering Wood",
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: []

        });

        console.assert(
            text.length < 60,
            `Expected the length safety net to keep choice text short even with a verbose problem, got '${text}' (${text.length} chars)`
        );

    }

    // =========================================================
    // Part 4 REVISED: role-based alternation was reverted (it produced
    // unnatural, game-label-sounding text like "the Energetic
    // Squirrel" since AdventureMetadataGenerator's role field isn't
    // guaranteed to be a simple common noun). The name is now always
    // used consistently -- verified here as the correct, intentional
    // behavior, not a regression.
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "asked_questions" as const, targetName: "Pip", targetRole: "Energetic Squirrel",
            prerequisites: [], effects: [], learningTags: [], emotionalEffects: {},
            relationshipEffects: [], narrativeSeed: "asks Pip", complexity: "trivial" as const, isEnding: true

        };

        const state = {
            location: "the wood", activeCharacterIds: ["pip"], currentGoal: "help",
            currentProblem: "the nest is empty", establishedFacts: [], unresolvedThreads: [],
            recentEventTypes: ["asked_questions" as const, "asked_questions" as const]
        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: state });

        console.assert(
            event.action.includes("Pip") && !event.action.includes("Energetic Squirrel"),
            `Expected the character's actual name, never the unnatural role field, got '${event.action}'`
        );

    }

    // =========================================================
    // Part 5: retry references the actual previous failure
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "retried" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "tries again",
            complexity: "trivial" as const, isEnding: true

        };

        const stateWithPriorFailure = {
            location: "the wood", activeCharacterIds: [], currentGoal: "help",
            currentProblem: "the nest is empty",
            establishedFacts: [],
            unresolvedThreads: ["an unfinished attempt at moving the branch"],
            recentEventTypes: [] as ("retried")[]
        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: stateWithPriorFailure });

        console.assert(
            event.action.includes("moving the branch"),
            `Expected retry's action to reference the actual prior failed attempt, got '${event.action}'`
        );

        console.assert(
            event.action !== "takes a breath and tries again",
            "Expected retry wording to NOT be the old context-free generic phrase when a prior failure is known"
        );

        // Without a prior failure, the generic phrase remains the honest fallback.
        const stateWithoutFailure = { ...stateWithPriorFailure, unresolvedThreads: [] };

        const genericEvent = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: stateWithoutFailure });

        console.assert(
            genericEvent.action === "take a breath and try again",
            "Expected the generic fallback when genuinely no prior failure is known"
        );

    }

    // =========================================================
    // Real browser bug: Gemini's initialProblem sometimes reads as a
    // full clause ("The sprite's light is fading") rather than a
    // noun phrase. Choice text must never embed it mid-sentence in a
    // way that produces broken grammar or a stray capital letter.
    // =========================================================

    {

        const builder = new ChoiceTextBuilder();

        const clauseShapedState = {

            location: "the Whispering Wood", activeCharacterIds: ["pip"], currentGoal: "help",
            currentProblem: "The sprite's light is fading",
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: []

        };

        const observedText = builder.build(
            { id: "c1", type: "observed", prerequisites: [], effects: [], learningTags: [], emotionalEffects: {},
              relationshipEffects: [], narrativeSeed: "observes", complexity: "trivial", isEnding: true },
            clauseShapedState
        );

        console.assert(
            !observedText.includes("at The") && !observedText.includes("about The"),
            `Expected no capitalized clause mid-sentence (the exact reported bug), got '${observedText}'`
        );

        // Design change: observed's choice text no longer embeds the
        // problem clause at all (it's already shown in the narration
        // above) -- which satisfies the original "no broken
        // capitalized clause" concern even more robustly than before.

        const askText = builder.build(
            { id: "c2", type: "asked_questions", targetName: "Pip", prerequisites: [], effects: [], learningTags: [],
              emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "asks", complexity: "trivial", isEnding: true },
            clauseShapedState
        );

        console.assert(
            !askText.includes("about The"),
            `Expected no broken 'about The...' construction, got '${askText}'`
        );

    }

    // =========================================================
    // Real browser bug: narration for observed/explored used to be
    // pure location text, completely disconnected from the actual
    // plot problem ("Ak pays close attention to the edge of the
    // Whispering Wood" while a squirrel is hiding a broken branch).
    // Narration must stay tied to the problem when one exists.
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "observed" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "observes",
            complexity: "trivial" as const, isEnding: true

        };

        const state = {

            location: "the Whispering Wood", activeCharacterIds: ["barnaby"], currentGoal: "help",
            currentProblem: "barnaby hid a broken branch",
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: []

        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: state });

        console.assert(
            event.action.includes("broken branch") || event.action.includes("barnaby hid"),
            `Expected narration to stay connected to the actual plot problem, got '${event.action}'`
        );

        console.assert(
            !event.action.includes("Whispering Wood"),
            "Expected narration to reference the PROBLEM, not fall back to disconnected generic location text, when a problem exists"
        );

    }

    // Choice text for retry/solve must remain readable even when the
    // problem is phrased as a past-tense fact rather than a true
    // "obstacle" noun phrase -- "Try again -- Barnaby hid a branch"
    // doesn't parse; "Think again about -- barnaby hid a branch" does.
    {

        const builder = new ChoiceTextBuilder();

        const state = {

            location: "the Whispering Wood", activeCharacterIds: [], currentGoal: "help",
            currentProblem: "barnaby hid a broken branch",
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: []

        };

        const retryText = builder.build(
            { id: "c1", type: "retried", prerequisites: [], effects: [], learningTags: [], emotionalEffects: {},
              relationshipEffects: [], narrativeSeed: "retries", complexity: "trivial", isEnding: true },
            state
        );

        console.assert(
            retryText.length > 0 && retryText.length < 60 && !retryText.includes("undefined"),
            `Expected well-formed retry wording even with a past-tense-fact problem, got '${retryText}'`
        );

    }

    // =========================================================
    // Real browser bug (now superseded by the second-person voice
    // switch, kept as a regression test for the underlying concern):
    // the opening must not jump straight into the situation with
    // zero scene-setting. Second-person design: the protagonist is
    // deliberately never named in narration ("you" instead) -- so
    // this now checks for "you" addressing the reader, not the name.
    // =========================================================

    {

        const renderer = new TemplateTextRenderer();

        const openingRequest = {

            ageRange: "7-8", tone: "fantasy_adventure", maxSentences: 3,
            location: "the Whispering Wood", actorName: "Ak",
            eventType: "adventure_opening",
            narrativeSeed: "A large, thorny bush has suddenly grown across the main path",
            complexity: "rich" as const

        };

        const result = await renderer.render(openingRequest);

        console.assert(
            /\byou\b/i.test(result.text),
            `Expected the second-person opening to address the reader as "you", got '${result.text}'`
        );

        console.assert(
            result.text.includes("thorny bush"),
            "Expected the actual situation to still be present, not replaced"
        );

    }

    // =========================================================
    // Real browser bug: a character's actual name at the start of an
    // interpolated clause was being incorrectly lowercased ("fiona
    // the firefly, who quietly witnessed..." instead of "Fiona").
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "observed" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "observes",
            complexity: "trivial" as const, isEnding: true

        };

        const state = {

            location: "the wood", activeCharacterIds: [], currentGoal: "help",
            currentProblem: "Fiona the firefly witnessed the accident",
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: []

        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: state });

        console.assert(
            event.action.includes("Fiona") && !event.action.includes("fiona"),
            `Expected the character's name to keep its capital letter, got '${event.action}'`
        );

    }

    // =========================================================
    // Real browser bug: narration said "a small squirrel" while
    // choices correctly said "Pip" -- the root RenderRequest never
    // passed the other character's name at all.
    // =========================================================

    {

        const renderer = new TemplateTextRenderer();

        const openingRequest = {

            ageRange: "7-8", tone: "fantasy_adventure", maxSentences: 3,
            location: "the Whispering Wood", actorName: "Ak",
            targetName: "Pip",
            eventType: "adventure_opening",
            narrativeSeed: "A small squirrel frantically scurries, dropping sparkling dewdrops",
            complexity: "rich" as const

        };

        const result = await renderer.render(openingRequest);

        console.assert(
            result.text.includes("Pip"),
            `Expected the opening to name the OTHER character too, not just the protagonist, got '${result.text}'`
        );

    }

    // =========================================================
    // Real browser bug: "Ak remembers what went wrong with a berry
    // basket is spilled and and tries a different way" -- a
    // truncated fragment ending in "and" had "and tries a different
    // way" concatenated directly onto it, producing "and and".
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "retried" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "retries",
            complexity: "trivial" as const, isEnding: true

        };

        const state = {

            location: "the wood", activeCharacterIds: [], currentGoal: "help",
            currentProblem: "a berry basket is spilled and",
            establishedFacts: [],
            unresolvedThreads: ["an unfinished attempt at a berry basket is spilled and scattered everywhere"],
            recentEventTypes: [] as ("retried")[]

        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: state });

        console.assert(
            !event.action.includes("and and"),
            `Expected no double conjunction from concatenating boilerplate onto a truncated fragment, got '${event.action}'`
        );

    }

    // =========================================================
    // Real browser bug: the template opening jumped straight from
    // "arrives at X" into the raw situation with zero breathing
    // room ("Ak steps into the Whispering Wood. A squirrel scatters
    // berries..."), reading as abrupt and mechanical rather than
    // like a story opening.
    // =========================================================

    {

        const renderer = new TemplateTextRenderer();

        const openingRequest = {

            ageRange: "7-8", tone: "fantasy_adventure", maxSentences: 3,
            location: "the Whispering Wood", actorName: "Ak",
            targetName: "Squeaky",
            eventType: "adventure_opening",
            narrativeSeed: "A small squirrel scatters a basket of berries near a grumpy bear's patch",
            complexity: "rich" as const

        };

        const result = await renderer.render(openingRequest);

        const wordCount = result.text.trim().split(/\s+/).length;

        console.assert(
            wordCount >= 15,
            `Expected real breathing room before the situation lands (not just arrival + immediate problem), got only ${wordCount} words: '${result.text}'`
        );

        console.assert(
            /\byou\b/i.test(result.text) && result.text.includes("berries"),
            `Expected second-person address and the actual situation to both still be present, got '${result.text}'`
        );

    }

    // =========================================================
    // Real browser bug: "Explorer looks around for anything
    // connected to a broken magical lantern needs fixing" -- the
    // template required `problem` to be a noun phrase (grammatical
    // object of "connected to"), which can't be reliably guaranteed
    // no matter how much the string itself is cleaned. Fixed by
    // switching to the dash construction (safe regardless of whether
    // the fragment is a noun phrase or a full clause).
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "explored" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "explores",
            complexity: "trivial" as const, isEnding: true

        };

        const state = {

            location: "the wood", activeCharacterIds: [], currentGoal: "help",
            currentProblem: "a broken magical lantern needs fixing",
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: []

        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: state });

        console.assert(
            !event.action.includes("connected to") && !event.action.includes("thinking about"),
            `Expected the fragile prepositional slot to be gone, got '${event.action}'`
        );

        console.assert(
            event.action.includes("—"),
            `Expected the safe dash construction instead, got '${event.action}'`
        );

    }

    // =========================================================
    // The narration-quality fix: Adventure.genome (theme, humor,
    // mystery, vocabulary) used to be generated once at adventure
    // creation and never used again -- every turn's narration was
    // hardcoded to tone "fantasy_adventure" regardless of the
    // adventure's actual theme or intended humor/mystery balance.
    // Proves it now genuinely reaches the render request.
    // =========================================================

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "explored" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "explores",
            complexity: "trivial" as const, isEnding: true

        };

        const state = {

            location: "a pirate cove", activeCharacterIds: [], currentGoal: "help",
            currentProblem: undefined, establishedFacts: [], unresolvedThreads: [], recentEventTypes: [],
            theme: "pirate adventure", humor: 0.8, mystery: 0.2, vocabulary: "rich"

        };

        const event = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: state });

        console.assert(
            event.style.tone === "pirate adventure",
            `Expected the adventure's real theme instead of hardcoded "fantasy_adventure", got '${event.style.tone}'`
        );

        console.assert(
            event.style.humor === 0.8 && event.style.vocabulary === "rich",
            `Expected humor/vocabulary to flow through from narrativeState, got humor=${event.style.humor} vocabulary=${event.style.vocabulary}`
        );

    }

    // --- Pacing: moral_fork/test beats get more room than hook/
    // complication/resolution ---

    {

        const builder = new SemanticEventBuilder();

        const candidate = {

            id: "c1", type: "explored" as const, prerequisites: [], effects: [], learningTags: [],
            emotionalEffects: {}, relationshipEffects: [], narrativeSeed: "explores",
            complexity: "trivial" as const, isEnding: true

        };

        const plotOutline = [
            { beat: "hook" as const, summary: "" },
            { beat: "complication" as const, summary: "" },
            { beat: "moral_fork" as const, summary: "" },
            { beat: "test" as const, summary: "" },
            { beat: "resolution" as const, summary: "" }
        ];

        const stateAtHook = {
            location: "the wood", activeCharacterIds: [], currentGoal: "help", currentProblem: undefined,
            establishedFacts: [], unresolvedThreads: [], recentEventTypes: [],
            plotOutline, currentBeatIndex: 0
        };

        const stateAtMoralFork = { ...stateAtHook, currentBeatIndex: 2 };

        const atHook = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: stateAtHook });

        const atMoralFork = builder.build({ candidate, actorName: "Ak", ageRange: "7-8", narrativeState: stateAtMoralFork });

        console.assert(
            atMoralFork.style.maxSentences > atHook.style.maxSentences,
            `Expected the moral_fork beat to get more room than the hook beat, got hook=${atHook.style.maxSentences} moral_fork=${atMoralFork.style.maxSentences}`
        );

    }

    console.log("Stabilization pass tests passed.");

}

main();
