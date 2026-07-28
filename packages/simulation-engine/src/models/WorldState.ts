export interface InventoryItem {

    id: string;

    name: string;

    quantity: number;

}

export interface RelationshipStatus {

    characterId: string;

    characterName: string;

    // Both clamped to [-100, 100] by the DeterministicSimulator.
    trust: number;

    affinity: number;

}

export type QuestStatus =
    | "not_started"
    | "active"
    | "completed"
    | "failed";

export interface QuestState {

    id: string;

    title: string;

    status: QuestStatus;

    // Clamped to [0, 100] by the DeterministicSimulator.
    progress: number;

}

export interface EconomyState {

    currency: string;

    balance: number;

}

import { Choice } from "./Choice";

// The World State is the single source of truth for the adventure.
// Per the Master Prompt: "The LLM is never the source of truth. The
// LLM: reasons, narrates, reflects. The World State: stores facts,
// tracks progress, maintains consistency." Only the
// DeterministicSimulator is permitted to produce a new WorldState.
export interface WorldState {

    worldId: string;

    childId: string;

    turn: number;

    location: string;

    inventory: InventoryItem[];

    relationships: RelationshipStatus[];

    quests: QuestState[];

    economy: EconomyState;

    // Arbitrary narrative facts established during play (e.g.
    // "metTheBaker": true, "bridgeIsBroken": true) that future
    // reasoning and retrieval can rely on as ground truth.
    flags: Record<string, boolean>;

    // Set once at adventure creation and never changed afterward.
    // The parent's free-form learning goal (already converted to a
    // concrete moral for this adventure) and the learning domain
    // used to scope Hybrid RAG retrieval. Reading these from
    // WorldState means the client never has to resend them on every
    // turn, and a client can't drift an adventure's intent mid-play.
    moral: string;

    domain: string;

    // The live situation: what the child is looking at right now.
    // Persisted so the next playTurn call can resolve a selected
    // choice id back to its text without the client re-sending it.
    currentNarrative: string;

    currentChoices: Choice[];

    // v3: which pre-generated Adventure (Story Graph) this
    // playthrough is walking, and which StoryNode it's currently at.
    // Optional so WorldState stays valid for anything not using the
    // graph runtime (existing tests, or a future non-graph mode) --
    // when both are set, currentNarrative/currentChoices above are a
    // convenience cache mirroring that node, not a second source of
    // truth; the node lookup via adventureId+currentNodeId is
    // authoritative.
    adventureId?: string;

    currentNodeId?: string;

    updatedAt: string;

}

export function createInitialWorldState(
    params: {
        worldId: string;
        childId: string;
        location: string;
        moral: string;
        domain: string;
        currency?: string;
    }
): WorldState {

    return {

        worldId: params.worldId,

        childId: params.childId,

        turn: 0,

        location: params.location,

        inventory: [],

        relationships: [],

        quests: [],

        economy: {

            currency: params.currency ?? "coins",

            balance: 0

        },

        flags: {},

        moral: params.moral,

        domain: params.domain,

        // Populated by ConsequenceEngine.openAdventure() immediately
        // after creation -- empty only for the instant between
        // "world exists" and "opening scene generated."
        currentNarrative: "",

        currentChoices: [],

        updatedAt: new Date().toISOString()

    };

}
