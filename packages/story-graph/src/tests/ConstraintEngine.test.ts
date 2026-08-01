import { ConstraintEngine } from "../services/ConstraintEngine";
import { CandidateEvent } from "../models/CandidateEvent";
import { createInitialWorldState } from "@storyforge/simulation-engine";

function candidateWith(prerequisites: CandidateEvent["prerequisites"]): CandidateEvent {

    return {

        id: "test-event",

        type: "explored",

        prerequisites,

        effects: [],

        learningTags: [],

        emotionalEffects: {},

        relationshipEffects: [],

        narrativeSeed: "does something",

        complexity: "trivial",

        isEnding: true

    };

}

function main(): void {

    const engine = new ConstraintEngine();

    const narrativeState = {

        location: "forest",

        activeCharacterIds: [] as string[],

        currentGoal: "figure out what's going on",

        currentProblem: "a mystery in the forest",

        establishedFacts: [] as string[],

        unresolvedThreads: [] as string[],

        recentEventTypes: [] as any[]

    };

    const state = createInitialWorldState({
        worldId: "w1", childId: "c1", location: "forest", moral: "honesty", domain: "ethics"
    });

    // --- flag_true ---

    const needsFlag = candidateWith([{ type: "flag_true", key: "metFox" }]);

    console.assert(
        !engine.check(needsFlag, { worldState: state, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected flag_true to fail when the flag is unset"
    );

    const withFlag = { ...state, flags: { metFox: true } };

    console.assert(
        engine.check(needsFlag, { worldState: withFlag, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected flag_true to pass once the flag is set"
    );

    // --- has_item ---

    const needsItem = candidateWith([{ type: "has_item", key: "torch" }]);

    console.assert(
        !engine.check(needsItem, { worldState: state, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected has_item to fail with an empty inventory"
    );

    const withItem = { ...state, inventory: [{ id: "torch", name: "Torch", quantity: 1 }] };

    console.assert(
        engine.check(needsItem, { worldState: withItem, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected has_item to pass once the item is present"
    );

    // --- npc_present ---

    const needsNpc = candidateWith([{ type: "npc_present", key: "fox" }]);

    console.assert(
        !engine.check(needsNpc, { worldState: state, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected npc_present to fail when the character isn't present"
    );

    console.assert(
        engine.check(needsNpc, { worldState: state, recentEventTypes: [], presentCharacterIds: ["fox"], narrativeState }).valid,
        "Expected npc_present to pass when the character is present"
    );

    // --- relationship_trust_at_least ---

    const needsTrust = candidateWith([{ type: "relationship_trust_at_least", key: "fox", threshold: 50 }]);

    console.assert(
        !engine.check(needsTrust, { worldState: state, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected relationship_trust_at_least to fail with no relationship on record (defaults to 0 trust)"
    );

    const trusted = { ...state, relationships: [{ characterId: "fox", characterName: "Fenn", trust: 60, affinity: 0 }] };

    console.assert(
        engine.check(needsTrust, { worldState: trusted, recentEventTypes: [], presentCharacterIds: [], narrativeState }).valid,
        "Expected relationship_trust_at_least to pass once trust meets the threshold"
    );

    // --- not_recently_used (cooldown) ---

    const onCooldown = candidateWith([{ type: "not_recently_used", key: "solved_puzzle", cooldownTurns: 2 }]);

    console.assert(
        !engine.check(onCooldown, {
            worldState: state,
            recentEventTypes: ["explored", "solved_puzzle"],
            presentCharacterIds: [], narrativeState }).valid,
        "Expected not_recently_used to fail when the type appears within the cooldown window"
    );

    console.assert(
        engine.check(onCooldown, {
            worldState: state,
            recentEventTypes: ["solved_puzzle", "explored", "explored"],
            presentCharacterIds: [], narrativeState }).valid,
        "Expected not_recently_used to pass once the type has aged out of the cooldown window"
    );

    // --- filter() over a list ---

    const candidates = [needsFlag, needsItem, candidateWith([])];

    const filtered = engine.filter(candidates, { worldState: state, recentEventTypes: [], presentCharacterIds: [], narrativeState });

    console.assert(
        filtered.length === 1,
        `Expected only the no-prerequisite candidate to pass, got ${filtered.length}`
    );

    console.log("ConstraintEngine tests passed.");

}

main();
