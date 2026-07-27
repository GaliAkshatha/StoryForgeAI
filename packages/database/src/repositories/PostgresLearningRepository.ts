import { PrismaClient } from "@prisma/client";
import { LearningAnalytics, SkillSignal } from "@storyforge/shared";
import { LearningRepository } from "@storyforge/learning";

interface LearningAnalyticsRecordRow {

    id: string;

    sessionId: string;

    childId: string;

    skillSignals: unknown;

    behaviorNotes: string[];

    summary: string;

    generatedAt: Date;

}

export class PostgresLearningRepository implements LearningRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async save(
        analytics: LearningAnalytics
    ): Promise<void> {

        await this.prisma.learningAnalyticsRecord.create({

            data: {

                id: crypto.randomUUID(),

                sessionId: analytics.sessionId,

                childId: analytics.childId,

                // Prisma's Json column accepts any JSON-serializable
                // value directly.
                skillSignals: analytics.skillSignals as unknown as object,

                behaviorNotes: analytics.behaviorNotes,

                summary: analytics.summary,

                generatedAt: new Date(analytics.generatedAt)

            }

        });

    }

    async findByChildId(
        childId: string,
        range?: { start: Date; end: Date }
    ): Promise<LearningAnalytics[]> {

        const records = await this.prisma.learningAnalyticsRecord.findMany({

            where: {

                childId,

                ...(range
                    ? { generatedAt: { gte: range.start, lte: range.end } }
                    : {})

            },

            orderBy: { generatedAt: "asc" }

        });

        return records.map(record => this.toDomain(record));

    }

    private toDomain(
        record: LearningAnalyticsRecordRow
    ): LearningAnalytics {

        return {

            sessionId: record.sessionId,

            childId: record.childId,

            skillSignals: record.skillSignals as SkillSignal[],

            behaviorNotes: record.behaviorNotes,

            summary: record.summary,

            generatedAt: record.generatedAt.toISOString()

        };

    }

}
