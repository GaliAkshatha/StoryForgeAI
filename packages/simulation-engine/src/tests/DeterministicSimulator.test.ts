import { DeterministicSimulator } from "../engine/DeterministicSimulator";
import { createInitialWorldState } from "../models/WorldState";
import { StateEffect } from "../models/StateEffect";

function main(): void {

    const simulator = new DeterministicSimulator();

    const initial = createInitialWorldState({
        worldId: "world-1",
        childId: "child-1",
        location: "Forest Clearing",
        moral: "honesty matters, even when it's hard",
        domain: "ethics"
    });

    // --- Inventory add/remove, including an invalid removal ---

    const effects: StateEffect[] = [

        {
            type: "inventory.add",
            payload: { itemId: "torch", name: "Torch", quantity: 1 }
        },

        {
            type: "inventory.remove",
            payload: { itemId: "sword", quantity: 1 }
        },

        {
            type: "relationship.delta",
            payload: {
                characterId: "npc-baker",
                characterName: "The Baker",
                trustDelta: 20,
                affinityDelta: 10
            }
        },

        {
            type: "quest.start",
            payload: { questId: "find-the-bridge", title: "Find the Bridge" }
        },

        {
            type: "economy.delta",
            payload: { amount: 5 }
        },

        {
            type: "flag.set",
            payload: { key: "metTheBaker", value: true }
        }

    ];

    const result = simulator.apply(initial, effects);

    console.assert(
        result.appliedEffects.length === 5,
        `Expected 5 applied effects (invalid removal dropped), got ${result.appliedEffects.length}`
    );

    console.assert(
        result.rejectedEffects.length === 1 &&
        result.rejectedEffects[0].effect.type === "inventory.remove",
        "Expected the sword removal to be rejected (not in inventory)"
    );

    console.assert(
        result.state.inventory.find(i => i.id === "torch")?.quantity === 1,
        "Expected torch to be added to inventory"
    );

    console.assert(
        result.state.relationships[0].trust === 20,
        "Expected baker trust to be 20"
    );

    console.assert(
        result.state.quests[0].status === "active",
        "Expected quest to be active"
    );

    console.assert(
        result.state.economy.balance === 5,
        "Expected economy balance to be 5"
    );

    console.assert(
        result.state.flags.metTheBaker === true,
        "Expected metTheBaker flag to be true"
    );

    console.assert(
        result.state.turn === 1,
        "Expected turn to increment to 1"
    );

    console.assert(
        initial.turn === 0 && initial.inventory.length === 0,
        "Expected original state to remain unmutated"
    );

    // --- Clamping ---

    const overTrust = simulator.apply(result.state, [
        {
            type: "relationship.delta",
            payload: {
                characterId: "npc-baker",
                characterName: "The Baker",
                trustDelta: 1000
            }
        }
    ]);

    console.assert(
        overTrust.state.relationships[0].trust === 100,
        `Expected trust to clamp at 100, got ${overTrust.state.relationships[0].trust}`
    );

    // --- Quest auto-completion at 100 progress ---

    const questProgressed = simulator.apply(result.state, [
        {
            type: "quest.progress",
            payload: { questId: "find-the-bridge", progressDelta: 150 }
        }
    ]);

    console.assert(
        questProgressed.state.quests[0].status === "completed" &&
        questProgressed.state.quests[0].progress === 100,
        "Expected quest to auto-complete and clamp progress at 100"
    );

    // --- Economy cannot go negative ---

    const overspend = simulator.apply(result.state, [
        { type: "economy.delta", payload: { amount: -1000 } }
    ]);

    console.assert(
        overspend.rejectedEffects.length === 1,
        "Expected overspending to be rejected"
    );

    console.assert(
        overspend.state.economy.balance === result.state.economy.balance,
        "Expected balance to be unchanged after rejected overspend"
    );

    console.log("DeterministicSimulator tests passed.");

}

main();
