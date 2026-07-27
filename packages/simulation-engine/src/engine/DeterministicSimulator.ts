import {
    WorldState,
    InventoryItem,
    RelationshipStatus,
    QuestState
} from "../models/WorldState";

import {
    StateEffect,
    InventoryAddPayload,
    InventoryRemovePayload,
    RelationshipDeltaPayload,
    QuestStartPayload,
    QuestProgressPayload,
    QuestCompletePayload,
    QuestFailPayload,
    EconomyDeltaPayload,
    FlagSetPayload,
    LocationSetPayload
} from "../models/StateEffect";

export interface SimulationResult {

    state: WorldState;

    // Effects that were actually applied. May be shorter than the
    // input list -- e.g. an "inventory.remove" for an item the child
    // doesn't have is dropped rather than silently going negative.
    appliedEffects: StateEffect[];

    rejectedEffects: { effect: StateEffect; reason: string }[];

}

// The only component in the system permitted to produce a new
// WorldState. Deterministic and side-effect free: given the same
// state and effects, it always produces the same result. This is
// what makes the WorldState the actual source of truth -- the LLM
// can propose effects, but only this class decides whether and how
// they land.
export class DeterministicSimulator {

    private static readonly RELATIONSHIP_BOUND = 100;

    private static readonly QUEST_PROGRESS_MAX = 100;

    apply(
        state: WorldState,
        effects: StateEffect[]
    ): SimulationResult {

        // Deep-clone so callers can never accidentally mutate the
        // WorldState they passed in.
        let next: WorldState = structuredClone(state);

        const appliedEffects: StateEffect[] = [];

        const rejectedEffects: { effect: StateEffect; reason: string }[] = [];

        for (const effect of effects) {

            const outcome = this.applyOne(next, effect);

            if (outcome.ok) {

                next = outcome.state;

                appliedEffects.push(effect);

            }
            else {

                rejectedEffects.push({
                    effect,
                    reason: outcome.reason
                });

            }

        }

        next.turn = next.turn + 1;

        next.updatedAt = new Date().toISOString();

        return {
            state: next,
            appliedEffects,
            rejectedEffects
        };

    }

    private applyOne(
        state: WorldState,
        effect: StateEffect
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        switch (effect.type) {

            case "inventory.add":
                return this.applyInventoryAdd(
                    state,
                    effect.payload as InventoryAddPayload
                );

            case "inventory.remove":
                return this.applyInventoryRemove(
                    state,
                    effect.payload as InventoryRemovePayload
                );

            case "relationship.delta":
                return this.applyRelationshipDelta(
                    state,
                    effect.payload as RelationshipDeltaPayload
                );

            case "quest.start":
                return this.applyQuestStart(
                    state,
                    effect.payload as QuestStartPayload
                );

            case "quest.progress":
                return this.applyQuestProgress(
                    state,
                    effect.payload as QuestProgressPayload
                );

            case "quest.complete":
                return this.applyQuestComplete(
                    state,
                    effect.payload as QuestCompletePayload
                );

            case "quest.fail":
                return this.applyQuestFail(
                    state,
                    effect.payload as QuestFailPayload
                );

            case "economy.delta":
                return this.applyEconomyDelta(
                    state,
                    effect.payload as EconomyDeltaPayload
                );

            case "flag.set":
                return this.applyFlagSet(
                    state,
                    effect.payload as FlagSetPayload
                );

            case "location.set":
                return this.applyLocationSet(
                    state,
                    effect.payload as LocationSetPayload
                );

            default:
                return {
                    ok: false,
                    reason: `Unknown effect type: ${(effect as StateEffect).type}`
                };

        }

    }

    private applyInventoryAdd(
        state: WorldState,
        payload: InventoryAddPayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        if (payload.quantity <= 0) {

            return {
                ok: false,
                reason: "inventory.add requires a positive quantity."
            };

        }

        const existing = state.inventory.find(
            item => item.id === payload.itemId
        );

        if (existing) {
            existing.quantity += payload.quantity;
        }
        else {

            const item: InventoryItem = {
                id: payload.itemId,
                name: payload.name,
                quantity: payload.quantity
            };

            state.inventory.push(item);

        }

        return { ok: true, state };

    }

    private applyInventoryRemove(
        state: WorldState,
        payload: InventoryRemovePayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        const existing = state.inventory.find(
            item => item.id === payload.itemId
        );

        if (!existing || existing.quantity < payload.quantity) {

            return {
                ok: false,
                reason: `Cannot remove ${payload.quantity} of '${payload.itemId}': not enough in inventory.`
            };

        }

        existing.quantity -= payload.quantity;

        if (existing.quantity === 0) {

            state.inventory = state.inventory.filter(
                item => item.id !== payload.itemId
            );

        }

        return { ok: true, state };

    }

    private applyRelationshipDelta(
        state: WorldState,
        payload: RelationshipDeltaPayload
    ): { ok: true; state: WorldState } {

        let relationship = state.relationships.find(
            r => r.characterId === payload.characterId
        );

        if (!relationship) {

            relationship = {
                characterId: payload.characterId,
                characterName: payload.characterName,
                trust: 0,
                affinity: 0
            };

            state.relationships.push(relationship);

        }

        relationship.trust = clamp(
            relationship.trust + (payload.trustDelta ?? 0),
            -DeterministicSimulator.RELATIONSHIP_BOUND,
            DeterministicSimulator.RELATIONSHIP_BOUND
        );

        relationship.affinity = clamp(
            relationship.affinity + (payload.affinityDelta ?? 0),
            -DeterministicSimulator.RELATIONSHIP_BOUND,
            DeterministicSimulator.RELATIONSHIP_BOUND
        );

        return { ok: true, state };

    }

    private applyQuestStart(
        state: WorldState,
        payload: QuestStartPayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        if (state.quests.some(q => q.id === payload.questId)) {

            return {
                ok: false,
                reason: `Quest '${payload.questId}' already exists.`
            };

        }

        const quest: QuestState = {
            id: payload.questId,
            title: payload.title,
            status: "active",
            progress: 0
        };

        state.quests.push(quest);

        return { ok: true, state };

    }

    private applyQuestProgress(
        state: WorldState,
        payload: QuestProgressPayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        const quest = state.quests.find(q => q.id === payload.questId);

        if (!quest) {

            return {
                ok: false,
                reason: `Quest '${payload.questId}' not found.`
            };

        }

        if (quest.status !== "active") {

            return {
                ok: false,
                reason: `Quest '${payload.questId}' is not active.`
            };

        }

        quest.progress = clamp(
            quest.progress + payload.progressDelta,
            0,
            DeterministicSimulator.QUEST_PROGRESS_MAX
        );

        if (quest.progress >= DeterministicSimulator.QUEST_PROGRESS_MAX) {
            quest.status = "completed";
        }

        return { ok: true, state };

    }

    private applyQuestComplete(
        state: WorldState,
        payload: QuestCompletePayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        const quest = state.quests.find(q => q.id === payload.questId);

        if (!quest) {

            return {
                ok: false,
                reason: `Quest '${payload.questId}' not found.`
            };

        }

        quest.status = "completed";

        quest.progress = DeterministicSimulator.QUEST_PROGRESS_MAX;

        return { ok: true, state };

    }

    private applyQuestFail(
        state: WorldState,
        payload: QuestFailPayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        const quest = state.quests.find(q => q.id === payload.questId);

        if (!quest) {

            return {
                ok: false,
                reason: `Quest '${payload.questId}' not found.`
            };

        }

        quest.status = "failed";

        return { ok: true, state };

    }

    private applyEconomyDelta(
        state: WorldState,
        payload: EconomyDeltaPayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        const nextBalance = state.economy.balance + payload.amount;

        if (nextBalance < 0) {

            return {
                ok: false,
                reason: "economy.delta would result in a negative balance."
            };

        }

        state.economy.balance = nextBalance;

        return { ok: true, state };

    }

    private applyFlagSet(
        state: WorldState,
        payload: FlagSetPayload
    ): { ok: true; state: WorldState } {

        state.flags[payload.key] = payload.value;

        return { ok: true, state };

    }

    private applyLocationSet(
        state: WorldState,
        payload: LocationSetPayload
    ): { ok: true; state: WorldState } | { ok: false; reason: string } {

        if (!payload.location) {

            return {
                ok: false,
                reason: "location.set requires a non-empty location."
            };

        }

        state.location = payload.location;

        return { ok: true, state };

    }

}

function clamp(value: number, min: number, max: number): number {

    return Math.min(max, Math.max(min, value));

}
