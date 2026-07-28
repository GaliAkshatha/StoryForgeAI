import { PrismaClient } from "@prisma/client";

import {
    NpcMemoryEntry,
    NpcMemoryRepository,
    NpcMemoryEventType
} from "@storyforge/story-graph";

interface NpcMemoryRow {

    id: string;

    childId: string;

    worldId: string;

    characterId: string;

    characterName: string;

    eventType: string;

    description: string;

    createdAt: Date;

}

export class PostgresNpcMemoryRepository implements NpcMemoryRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async record(
        entry: NpcMemoryEntry
    ): Promise<void> {

        await this.prisma.npcMemoryRecord.create({

            data: {

                id: entry.id,

                childId: entry.childId,

                worldId: entry.worldId,

                characterId: entry.characterId,

                characterName: entry.characterName,

                eventType: entry.eventType,

                description: entry.description,

                createdAt: new Date(entry.createdAt)

            }

        });

    }

    async findByCharacter(
        worldId: string,
        characterId: string
    ): Promise<NpcMemoryEntry[]> {

        const records = await this.prisma.npcMemoryRecord.findMany({
            where: { worldId, characterId },
            orderBy: { createdAt: "asc" }
        });

        return records.map((record: NpcMemoryRow) => this.toDomain(record));

    }

    async findByWorldId(
        worldId: string
    ): Promise<NpcMemoryEntry[]> {

        const records = await this.prisma.npcMemoryRecord.findMany({
            where: { worldId },
            orderBy: { createdAt: "asc" }
        });

        return records.map((record: NpcMemoryRow) => this.toDomain(record));

    }

    private toDomain(
        record: NpcMemoryRow
    ): NpcMemoryEntry {

        return {

            id: record.id,

            childId: record.childId,

            worldId: record.worldId,

            characterId: record.characterId,

            characterName: record.characterName,

            eventType: record.eventType as NpcMemoryEventType,

            description: record.description,

            createdAt: record.createdAt.toISOString()

        };

    }

}
