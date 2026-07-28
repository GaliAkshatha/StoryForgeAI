export type NpcMemoryEventType =
    | "promise_made"
    | "promise_kept"
    | "promise_broken"
    | "help_given"
    | "item_shared"
    | "trust_gained"
    | "trust_lost";

// Phase 10: "NPCs remember Promises, Trust, Relationship, Past
// Encounters, Help Given, Items Shared." WorldState.relationships
// already tracks the numeric trust/affinity that drives this, and
// that already flows into generation prompts (see
// AdventureBlueprintGenerator.expandFrom) so NPCs can reference it
// narratively. NpcMemoryEntry is the durable, human-readable LOG
// behind those numbers -- "why" a relationship is where it is, not
// just "what" it currently measures.
export interface NpcMemoryEntry {

    id: string;

    childId: string;

    worldId: string;

    characterId: string;

    characterName: string;

    eventType: NpcMemoryEventType;

    description: string;

    createdAt: string;

}
