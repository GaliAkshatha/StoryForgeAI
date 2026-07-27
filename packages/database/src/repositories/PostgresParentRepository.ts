import { PrismaClient } from "@prisma/client";
import { ParentProfile, ParentRepository } from "@storyforge/parent";

interface ParentProfileRecord {

    id: string;

    userId: string;

    displayName: string;

    childIds: string[];

    weeklyReportEmailEnabled: boolean;

    dailyPlayLimitMinutes: number;

    createdAt: Date;

}

export class PostgresParentRepository implements ParentRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async findByUserId(
        userId: string
    ): Promise<ParentProfile | undefined> {

        const record = await this.prisma.parentProfile.findUnique({
            where: { userId }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async findById(
        id: string
    ): Promise<ParentProfile | undefined> {

        const record = await this.prisma.parentProfile.findUnique({
            where: { id }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async save(
        profile: ParentProfile
    ): Promise<void> {

        await this.prisma.parentProfile.upsert({

            where: { id: profile.id },

            create: {

                id: profile.id,

                userId: profile.userId,

                displayName: profile.displayName,

                childIds: profile.childIds,

                weeklyReportEmailEnabled: profile.settings.weeklyReportEmailEnabled,

                dailyPlayLimitMinutes: profile.settings.dailyPlayLimitMinutes,

                createdAt: new Date(profile.createdAt)

            },

            update: {

                displayName: profile.displayName,

                childIds: profile.childIds,

                weeklyReportEmailEnabled: profile.settings.weeklyReportEmailEnabled,

                dailyPlayLimitMinutes: profile.settings.dailyPlayLimitMinutes

            }

        });

    }

    private toDomain(
        record: ParentProfileRecord
    ): ParentProfile {

        return {

            id: record.id,

            userId: record.userId,

            displayName: record.displayName,

            childIds: record.childIds,

            settings: {

                weeklyReportEmailEnabled: record.weeklyReportEmailEnabled,

                dailyPlayLimitMinutes: record.dailyPlayLimitMinutes

            },

            createdAt: record.createdAt.toISOString()

        };

    }

}
