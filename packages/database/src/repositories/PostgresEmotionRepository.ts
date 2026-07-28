import { PrismaClient } from "@prisma/client";

import {
    EmotionState,
    EmotionRepository,
    EmotionProfile
} from "@storyforge/story-graph";

interface EmotionStateRow {

    id: string;

    childId: string;

    sessionId: string;

    worldId: string;

    emotion: unknown;

    recordedAt: Date;

}

export class PostgresEmotionRepository implements EmotionRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async record(
        state: EmotionState
    ): Promise<void> {

        await this.prisma.emotionStateRecord.create({

            data: {

                id: state.id,

                childId: state.childId,

                sessionId: state.sessionId,

                worldId: state.worldId,

                emotion: state.emotion as unknown as object,

                recordedAt: new Date(state.recordedAt)

            }

        });

    }

    async findByChildId(
        childId: string,
        limit?: number
    ): Promise<EmotionState[]> {

        const records = await this.prisma.emotionStateRecord.findMany({

            where: { childId },

            orderBy: { recordedAt: "asc" },

            ...(limit ? { take: -limit } : {})

        });

        return records.map((record: EmotionStateRow) => this.toDomain(record));

    }

    async findRecentBySession(
        sessionId: string,
        limit: number
    ): Promise<EmotionState[]> {

        const records = await this.prisma.emotionStateRecord.findMany({

            where: { sessionId },

            orderBy: { recordedAt: "desc" },

            take: limit

        });

        return records.map((record: EmotionStateRow) => this.toDomain(record)).reverse();

    }

    private toDomain(
        record: EmotionStateRow
    ): EmotionState {

        return {

            id: record.id,

            childId: record.childId,

            sessionId: record.sessionId,

            worldId: record.worldId,

            emotion: record.emotion as EmotionProfile,

            recordedAt: record.recordedAt.toISOString()

        };

    }

}
