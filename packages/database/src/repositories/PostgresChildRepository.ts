import { PrismaClient } from "@prisma/client";
import { ChildProfile, ChildRepository } from "@storyforge/child";

interface ChildProfileRecord {

    id: string;

    parentId: string;

    name: string;

    ageRange: string;

    readingLevel: string;

    vocabularyLevel: string;

    avatarId: string;

    aboutChild: string | null;

    adventureWorldIds: string[];

    createdAt: Date;

}

export class PostgresChildRepository implements ChildRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async findById(
        id: string
    ): Promise<ChildProfile | undefined> {

        const record = await this.prisma.childProfile.findUnique({
            where: { id }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async findByParentId(
        parentId: string
    ): Promise<ChildProfile[]> {

        const records = await this.prisma.childProfile.findMany({
            where: { parentId },
            orderBy: { createdAt: "asc" }
        });

        return records.map(record => this.toDomain(record));

    }

    async save(
        profile: ChildProfile
    ): Promise<void> {

        await this.prisma.childProfile.upsert({

            where: { id: profile.id },

            create: {

                id: profile.id,

                parentId: profile.parentId,

                name: profile.name,

                ageRange: profile.ageRange,

                readingLevel: profile.readingLevel,

                vocabularyLevel: profile.vocabularyLevel,

                avatarId: profile.avatarId,

                aboutChild: profile.aboutChild ?? null,

                adventureWorldIds: profile.adventureWorldIds,

                createdAt: new Date(profile.createdAt)

            },

            update: {

                name: profile.name,

                ageRange: profile.ageRange,

                readingLevel: profile.readingLevel,

                vocabularyLevel: profile.vocabularyLevel,

                avatarId: profile.avatarId,

                aboutChild: profile.aboutChild ?? null,

                adventureWorldIds: profile.adventureWorldIds

            }

        });

    }

    private toDomain(
        record: ChildProfileRecord
    ): ChildProfile {

        return {

            id: record.id,

            parentId: record.parentId,

            name: record.name,

            ageRange: record.ageRange,

            readingLevel: record.readingLevel,

            vocabularyLevel: record.vocabularyLevel,

            avatarId: record.avatarId,

            aboutChild: record.aboutChild ?? undefined,

            adventureWorldIds: record.adventureWorldIds,

            createdAt: record.createdAt.toISOString()

        };

    }

}
