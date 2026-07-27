import { PrismaClient } from "@prisma/client";

import {
    WorldState,
    WorldStateStore,
    InventoryItem,
    RelationshipStatus,
    QuestState,
    EconomyState,
    Choice
} from "@storyforge/simulation-engine";

interface WorldStateRow {

    worldId: string;

    childId: string;

    turn: number;

    location: string;

    inventory: unknown;

    relationships: unknown;

    quests: unknown;

    economy: unknown;

    flags: unknown;

    moral: string;

    domain: string;

    currentNarrative: string;

    currentChoices: unknown;

    updatedAt: Date;

}

// Implements the exact same WorldStateStore interface
// InMemoryWorldStateStore does. The Consequence Engine and
// AdventureRuntime construct/read/write WorldState through this
// interface only -- neither knows or cares that the state now
// survives a restart.
export class PostgresWorldStateStore implements WorldStateStore {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async get(
        worldId: string
    ): Promise<WorldState | undefined> {

        const record = await this.prisma.worldStateRecord.findUnique({
            where: { worldId }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async create(
        state: WorldState
    ): Promise<void> {

        await this.prisma.worldStateRecord.create({
            data: this.toRow(state)
        });

    }

    async save(
        state: WorldState
    ): Promise<void> {

        const row = this.toRow(state);

        await this.prisma.worldStateRecord.upsert({

            where: { worldId: state.worldId },

            create: row,

            update: row

        });

    }

    private toRow(
        state: WorldState
    ) {

        return {

            worldId: state.worldId,

            childId: state.childId,

            turn: state.turn,

            location: state.location,

            inventory: state.inventory as unknown as object,

            relationships: state.relationships as unknown as object,

            quests: state.quests as unknown as object,

            economy: state.economy as unknown as object,

            flags: state.flags as unknown as object,

            moral: state.moral,

            domain: state.domain,

            currentNarrative: state.currentNarrative,

            currentChoices: state.currentChoices as unknown as object,

            updatedAt: new Date(state.updatedAt)

        };

    }

    private toDomain(
        record: WorldStateRow
    ): WorldState {

        return {

            worldId: record.worldId,

            childId: record.childId,

            turn: record.turn,

            location: record.location,

            inventory: record.inventory as InventoryItem[],

            relationships: record.relationships as RelationshipStatus[],

            quests: record.quests as QuestState[],

            economy: record.economy as EconomyState,

            flags: record.flags as Record<string, boolean>,

            moral: record.moral,

            domain: record.domain,

            currentNarrative: record.currentNarrative,

            currentChoices: record.currentChoices as Choice[],

            updatedAt: record.updatedAt.toISOString()

        };

    }

}
