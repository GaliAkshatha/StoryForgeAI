export type StateEffectType =
    | "inventory.add"
    | "inventory.remove"
    | "relationship.delta"
    | "quest.start"
    | "quest.progress"
    | "quest.complete"
    | "quest.fail"
    | "economy.delta"
    | "flag.set"
    | "location.set";

export interface InventoryAddPayload {
    itemId: string;
    name: string;
    quantity: number;
}

export interface InventoryRemovePayload {
    itemId: string;
    quantity: number;
}

export interface RelationshipDeltaPayload {
    characterId: string;
    characterName: string;
    trustDelta?: number;
    affinityDelta?: number;
}

export interface QuestStartPayload {
    questId: string;
    title: string;
}

export interface QuestProgressPayload {
    questId: string;
    progressDelta: number;
}

export interface QuestCompletePayload {
    questId: string;
}

export interface QuestFailPayload {
    questId: string;
}

export interface EconomyDeltaPayload {
    amount: number;
}

export interface FlagSetPayload {
    key: string;
    value: boolean;
}

export interface LocationSetPayload {
    location: string;
}

export type StateEffectPayload =
    | InventoryAddPayload
    | InventoryRemovePayload
    | RelationshipDeltaPayload
    | QuestStartPayload
    | QuestProgressPayload
    | QuestCompletePayload
    | QuestFailPayload
    | EconomyDeltaPayload
    | FlagSetPayload
    | LocationSetPayload;

// A single proposed, deterministic mutation to the WorldState. The
// LLM (via the Consequence Engine) is only ever allowed to PROPOSE
// these -- the DeterministicSimulator is the sole component that
// actually applies them, validating and clamping along the way.
export interface StateEffect {

    type: StateEffectType;

    payload: StateEffectPayload;

}
