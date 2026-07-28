import { PrismaClient } from "@prisma/client";

import {
    Achievement,
    AchievementRepository
} from "@storyforge/story-graph";

interface AchievementRow {

    id: string;

    childId: string;

    key: string;

    title: string;

    description: string;

    unlockedAt: Date;

}

export class PostgresAchievementRepository implements AchievementRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async unlock(
        achievement: Achievement
    ): Promise<void> {

        await this.prisma.achievementRecord.create({

            data: {

                id: achievement.id,

                childId: achievement.childId,

                key: achievement.key,

                title: achievement.title,

                description: achievement.description,

                unlockedAt: new Date(achievement.unlockedAt)

            }

        });

    }

    async findByChildId(
        childId: string
    ): Promise<Achievement[]> {

        const records = await this.prisma.achievementRecord.findMany({
            where: { childId },
            orderBy: { unlockedAt: "asc" }
        });

        return records.map((record: AchievementRow) => this.toDomain(record));

    }

    async hasUnlocked(
        childId: string,
        key: string
    ): Promise<boolean> {

        const existing = await this.prisma.achievementRecord.findMany({
            where: { childId, key }
        });

        return existing.length > 0;

    }

    private toDomain(
        record: AchievementRow
    ): Achievement {

        return {

            id: record.id,

            childId: record.childId,

            key: record.key,

            title: record.title,

            description: record.description,

            unlockedAt: record.unlockedAt.toISOString()

        };

    }

}
