import { CandidateEventGenerator } from "../services/CandidateEventGenerator";
import { ConstraintEngine, ConstraintContext } from "../services/ConstraintEngine";
import { NarrativeStateTransition } from "../services/NarrativeStateTransition";
import { NarrativeState, createInitialWorldState } from "@storyforge/simulation-engine";
import { StoryNode } from "../models/StoryNode";
import { neutralEmotionProfile } from "../models/EmotionProfile";

function baseNarrativeState(overrides: Partial<NarrativeState> = {}): NarrativeState {

    return {

        location: "the clearing",

        activeCharacterIds: [],

        currentGoal: "find a way through",

        currentProblem: undefined,

        establishedFacts: [],

        unresolvedThreads: [],

        recentEventTypes: [],

        ...overrides

    };

}

function baseConstraintContext(narrativeState: NarrativeState): ConstraintContext {

    return {

        worldState: createInitialWorldState({
            worldId: "w1", childId: "c1", location: narrativeState.location, moral: "honesty", domain: "ethics"
        }),

        recentEventTypes: [],

        presentCharacterIds: narrativeState.activeCharacterIds,

        narrativeState

    };

}

function main(): void {

    const generator = new CandidateEventGenerator();

    const constraintEngine = new ConstraintEngine();

    const transition = new NarrativeStateTransition();

    // =========================================================
    // C. Character continuity
    // =========================================================

    {

        const squeak = { id: "squeak", name: "Squeak", role: "friend", description: "" };

        const professor = { id: "professor", name: "Professor Hoot", role: "mentor", description: "" };

        const narrativeState = baseNarrativeState({ activeCharacterIds: ["squeak"] });

        const candidates = generator.generate({
            location: narrativeState.location,
            characters: [squeak, professor],
            activeCharacterIds: narrativeState.activeCharacterIds,
            domain: "ethics",
            turnIndex: 1
        });

        const helpNpc = candidates.find(c => c.type === "helped_npc")!;

        console.assert(
            helpNpc.targetId === "squeak",
            `Expected the target to be the ONLY active character (Squeak), not Professor Hoot who was never established, got '${helpNpc.targetId}'`
        );

        console.assert(
            candidates.every(c => c.targetId !== "professor"),
            "Expected Professor Hoot to never be selected as a target while not established/active"
        );

    }

    // =========================================================
    // D. Retry continuity
    // =========================================================

    {

        const narrativeState = baseNarrativeState({ currentProblem: "a stuck door" });

        const candidates = generator.generate({
            location: narrativeState.location, characters: [], activeCharacterIds: [], domain: "ethics", turnIndex: 0
        });

        const retried = candidates.find(c => c.type === "retried")!;

        const noFailureContext = baseConstraintContext(narrativeState);

        console.assert(
            !constraintEngine.check(retried, noFailureContext).valid,
            "Expected 'retried' to be rejected with no established prior failure"
        );

        const withFailure = {
            ...noFailureContext.worldState,
            flags: { hasFailedAttempt: true }
        };

        console.assert(
            constraintEngine.check(retried, { ...noFailureContext, worldState: withFailure }).valid,
            "Expected 'retried' to become valid once a prior failure is established"
        );

    }

    // =========================================================
    // E. Puzzle continuity (solved_puzzle / failed_puzzle)
    // =========================================================

    {

        const noProblem = baseNarrativeState();

        const withProblem = baseNarrativeState({ currentProblem: "a locked gate" });

        const candidatesNoProblem = generator.generate({
            location: noProblem.location, characters: [], activeCharacterIds: [], domain: "ethics", turnIndex: 0
        });

        const solved = candidatesNoProblem.find(c => c.type === "solved_puzzle")!;

        const failed = candidatesNoProblem.find(c => c.type === "failed_puzzle")!;

        console.assert(
            !constraintEngine.check(solved, baseConstraintContext(noProblem)).valid,
            "Expected 'solved_puzzle' to be rejected with no established problem"
        );

        console.assert(
            !constraintEngine.check(failed, baseConstraintContext(noProblem)).valid,
            "Expected 'failed_puzzle' to be rejected with no established problem"
        );

        console.assert(
            constraintEngine.check(solved, baseConstraintContext(withProblem)).valid,
            "Expected 'solved_puzzle' to become valid once a problem is established"
        );

        console.assert(
            constraintEngine.check(failed, baseConstraintContext(withProblem)).valid,
            "Expected 'failed_puzzle' to become valid once a problem is established"
        );

    }

    // =========================================================
    // F. Warning continuity
    // =========================================================

    {

        const narrativeState = baseNarrativeState();

        const candidates = generator.generate({
            location: narrativeState.location, characters: [], activeCharacterIds: [], domain: "ethics", turnIndex: 0
        });

        const ignoredWarning = candidates.find(c => c.type === "ignored_warning")!;

        const noWarningContext = baseConstraintContext(narrativeState);

        console.assert(
            !constraintEngine.check(ignoredWarning, noWarningContext).valid,
            "Expected 'ignored_warning' to be rejected with no established warning"
        );

        const withWarning = { ...noWarningContext.worldState, flags: { warningEstablished: true } };

        console.assert(
            constraintEngine.check(ignoredWarning, { ...noWarningContext, worldState: withWarning }).valid,
            "Expected 'ignored_warning' to become valid once a warning is established"
        );

    }

    // =========================================================
    // G. Help continuity
    // =========================================================

    {

        const squeak = { id: "squeak", name: "Squeak", role: "friend", description: "" };

        const noProblem = baseNarrativeState({ activeCharacterIds: ["squeak"] });

        const withProblem = baseNarrativeState({ activeCharacterIds: ["squeak"], currentProblem: "a fallen branch" });

        const candidates = generator.generate({
            location: noProblem.location, characters: [squeak], activeCharacterIds: ["squeak"], domain: "ethics", turnIndex: 0
        });

        const helped = candidates.find(c => c.type === "helped_npc")!;

        console.assert(
            !constraintEngine.check(helped, baseConstraintContext(noProblem)).valid,
            "Expected 'helped_npc' to be rejected without an established need/problem, even with an active target"
        );

        console.assert(
            constraintEngine.check(helped, baseConstraintContext(withProblem)).valid,
            "Expected 'helped_npc' to become valid once both a target and a problem are established"
        );

    }

    // =========================================================
    // H. State transition -- before != after
    // =========================================================

    {

        const before = baseNarrativeState({ currentProblem: "a mystery" });

        const node: StoryNode = {

            id: "node-1", adventureId: "a1", narrative: "text", choices: [],
            learningSignals: [], emotion: neutralEmotionProfile(), effects: [],
            difficulty: 1, readingLevel: "7-8", isEnding: true,
            eventType: "solved_puzzle", targetCharacterId: undefined, targetCharacterName: undefined,
            narrativeConsequence: "the mystery is solved", createdAt: new Date().toISOString()

        };

        const after = transition.apply(before, node);

        console.assert(
            JSON.stringify(before) !== JSON.stringify(after),
            "Expected NarrativeState to genuinely change after applying an event's transition"
        );

        console.assert(
            after.currentProblem === undefined,
            "Expected solved_puzzle to clear currentProblem"
        );

        console.assert(
            after.establishedFacts.includes("the mystery is solved"),
            "Expected the consequence to become an established fact"
        );

    }

    // =========================================================
    // I. Branch isolation -- unvisited choices must not mutate state
    // =========================================================

    {

        const before = baseNarrativeState({ activeCharacterIds: ["squeak"] });

        const chosenNode: StoryNode = {

            id: "chosen", adventureId: "a1", narrative: "", choices: [],
            learningSignals: [], emotion: neutralEmotionProfile(), effects: [],
            difficulty: 1, readingLevel: "7-8", isEnding: true,
            eventType: "explored", narrativeConsequence: "found a hidden path",
            threadIntroduced: "a hidden path noticed nearby",
            createdAt: new Date().toISOString()

        };

        const unvisitedSiblingA: StoryNode = {

            ...chosenNode, id: "sibling-a", eventType: "asked_questions",
            targetCharacterId: "owl", targetCharacterName: "Orla",
            narrativeConsequence: "Orla revealed a secret"

        };

        const unvisitedSiblingB: StoryNode = {

            ...chosenNode, id: "sibling-b", eventType: "led_team",
            narrativeConsequence: "everyone rallied together"

        };

        const after = transition.apply(before, chosenNode);

        console.assert(
            after.establishedFacts.includes("found a hidden path"),
            "Expected the chosen node's own fact to be established"
        );

        console.assert(
            !after.establishedFacts.includes("Orla revealed a secret") &&
            !after.establishedFacts.includes("everyone rallied together"),
            "Expected unvisited sibling facts to NEVER appear in NarrativeState"
        );

        console.assert(
            !after.activeCharacterIds.includes("owl"),
            "Expected an unvisited sibling's character introduction to never activate that character"
        );

        void unvisitedSiblingA;
        void unvisitedSiblingB;

    }

    // =========================================================
    // Phase 2B (Section B): character-introduction invariant fix.
    // Targeting an inactive character must NOT auto-activate them --
    // only an explicit characterIntroduced signal may.
    // =========================================================

    {

        const before = baseNarrativeState({ activeCharacterIds: ["squeak"] });

        // Targets an INACTIVE character (owl) without any explicit
        // introduction signal -- must NOT activate them.
        const targetsInactiveCharacter: StoryNode = {

            id: "n1", adventureId: "a1", narrative: "", choices: [],
            learningSignals: [], emotion: neutralEmotionProfile(), effects: [],
            difficulty: 1, readingLevel: "7-8", isEnding: true,
            eventType: "asked_questions",
            targetCharacterId: "owl", targetCharacterName: "Orla",
            createdAt: new Date().toISOString()

        };

        const afterTargeting = transition.apply(before, targetsInactiveCharacter);

        console.assert(
            !afterTargeting.activeCharacterIds.includes("owl"),
            "Expected merely targeting an inactive character to NOT activate them"
        );

        // An EXPLICIT characterIntroduced signal DOES activate them.
        const explicitlyIntroduces: StoryNode = {

            ...targetsInactiveCharacter,
            id: "n2",
            characterIntroducedId: "owl",
            characterIntroducedName: "Orla"

        };

        const afterIntroduction = transition.apply(before, explicitlyIntroduces);

        console.assert(
            afterIntroduction.activeCharacterIds.includes("owl"),
            "Expected an explicit characterIntroduced signal to activate the character"
        );

        // Existing active characters remain active either way.
        console.assert(
            afterTargeting.activeCharacterIds.includes("squeak") &&
            afterIntroduction.activeCharacterIds.includes("squeak"),
            "Expected already-active characters to remain active"
        );

    }

    console.log("Narrative continuity tests passed.");

}

main();
