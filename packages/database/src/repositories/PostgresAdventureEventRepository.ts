import { PrismaClient } from "@prisma/client";

import {
    AdventureEvent,
    AdventureEventRepository,
    EmotionProfile
} from "@storyforge/story-graph";

import { AdventureEventType } from "@storyforge/shared";

interface AdventureEventRow {

    id: string;

    worldId: string;

    sessionId: string;

    childId: string;

    adventureId: string;

    nodeId: string;

    eventType: string;

    narrative: string;

    emotion: unknown;

    createdAt: Date;

}

export class PostgresAdventureEventRepository implements AdventureEventRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async append(
        event: AdventureEvent
    ): Promise<void> {

        await this.prisma.adventureEventRecord.create({

            data: {

                id: event.id,

                worldId: event.worldId,

                sessionId: event.sessionId,

                childId: event.childId,

                adventureId: event.adventureId,

                nodeId: event.nodeId,

                eventType: event.eventType,

                narrative: event.narrative,

                emotion: event.emotion as unknown as object,

                createdAt: new Date(event.createdAt)

            }

        });

    }

    async findBySessionId(
        sessionId: string
    ): Promise<AdventureEvent[]> {

        const records = await this.prisma.adventureEventRecord.findMany({
            where: { sessionId },
            orderBy: { createdAt: "asc" }
        });

        return records.map(record => this.toDomain(record));

    }

    async findBySessionIdSince(
        sessionId: string,
        since: string
    ): Promise<AdventureEvent[]> {

        const records = await this.prisma.adventureEventRecord.findMany({
            where: { sessionId, createdAt: { gte: new Date(since) } },
            orderBy: { createdAt: "asc" }
        });

        return records.map(record => this.toDomain(record));

    }

    private toDomain(
        record: AdventureEventRow
    ): AdventureEvent {

        return {

            id: record.id,

            worldId: record.worldId,

            sessionId: record.sessionId,

            childId: record.childId,

            adventureId: record.adventureId,

            nodeId: record.nodeId,

            eventType: record.eventType as AdventureEventType,

            narrative: record.narrative,

            emotion: record.emotion as EmotionProfile,

            createdAt: record.createdAt.toISOString()

        };

    }

}
