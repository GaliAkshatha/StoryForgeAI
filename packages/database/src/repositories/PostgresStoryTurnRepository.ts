import { PrismaClient } from "@prisma/client";
import { StoryTurn, StoryTurnRepository } from "@storyforge/simulation-engine";

interface StoryTurnRow {

    id: string;

    worldId: string;

    sessionId: string;

    childId: string;

    situationText: string;

    decisionText: string;

    consequenceNarrative: string;

    reflectionQuestion: string;

    learningSignals: string[];

    createdAt: Date;

}

export class PostgresStoryTurnRepository implements StoryTurnRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async append(
        turn: StoryTurn
    ): Promise<void> {

        await this.prisma.storyTurnRecord.create({

            data: {

                id: turn.id,

                worldId: turn.worldId,

                sessionId: turn.sessionId,

                childId: turn.childId,

                situationText: turn.situationText,

                decisionText: turn.decisionText,

                consequenceNarrative: turn.consequenceNarrative,

                reflectionQuestion: turn.reflectionQuestion,

                learningSignals: turn.learningSignals,

                createdAt: new Date(turn.createdAt)

            }

        });

    }

    async findBySessionId(
        sessionId: string
    ): Promise<StoryTurn[]> {

        const records = await this.prisma.storyTurnRecord.findMany({
            where: { sessionId },
            orderBy: { createdAt: "asc" }
        });

        return records.map(record => this.toDomain(record));

    }

    async findByWorldId(
        worldId: string
    ): Promise<StoryTurn[]> {

        const records = await this.prisma.storyTurnRecord.findMany({
            where: { worldId },
            orderBy: { createdAt: "asc" }
        });

        return records.map(record => this.toDomain(record));

    }

    private toDomain(
        record: StoryTurnRow
    ): StoryTurn {

        return {

            id: record.id,

            worldId: record.worldId,

            sessionId: record.sessionId,

            childId: record.childId,

            situationText: record.situationText,

            decisionText: record.decisionText,

            consequenceNarrative: record.consequenceNarrative,

            reflectionQuestion: record.reflectionQuestion,

            learningSignals: record.learningSignals,

            createdAt: record.createdAt.toISOString()

        };

    }

}
