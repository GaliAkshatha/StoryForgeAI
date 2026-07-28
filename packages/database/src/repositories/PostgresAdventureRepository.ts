import { PrismaClient } from "@prisma/client";

import {
    Adventure,
    AdventureRepository,
    AdventureCharacter,
    AdventureWorld,
    LearningPlanEntry,
    EmotionCurvePoint,
    StoryGenome
} from "@storyforge/story-graph";

interface AdventureRow {

    id: string;

    childId: string;

    title: string;

    moral: string;

    domain: string;

    characters: unknown;

    world: unknown;

    learningPlan: unknown;

    emotionCurve: unknown;

    genome: unknown;

    rootNodeId: string;

    createdAt: Date;

}

export class PostgresAdventureRepository implements AdventureRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async findById(
        id: string
    ): Promise<Adventure | undefined> {

        const record = await this.prisma.adventureRecord.findUnique({
            where: { id }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async findByChildId(
        childId: string
    ): Promise<Adventure[]> {

        const records = await this.prisma.adventureRecord.findMany({
            where: { childId },
            orderBy: { createdAt: "desc" }
        });

        return records.map(record => this.toDomain(record));

    }

    async save(
        adventure: Adventure
    ): Promise<void> {

        const row = {

            id: adventure.id,

            childId: adventure.childId,

            title: adventure.title,

            moral: adventure.moral,

            domain: adventure.domain,

            characters: adventure.characters as unknown as object,

            world: adventure.world as unknown as object,

            learningPlan: adventure.learningPlan as unknown as object,

            emotionCurve: adventure.emotionCurve as unknown as object,

            genome: adventure.genome as unknown as object,

            rootNodeId: adventure.rootNodeId,

            createdAt: new Date(adventure.createdAt)

        };

        await this.prisma.adventureRecord.upsert({

            where: { id: adventure.id },

            create: row,

            update: row

        });

    }

    private toDomain(
        record: AdventureRow
    ): Adventure {

        return {

            id: record.id,

            childId: record.childId,

            title: record.title,

            moral: record.moral,

            domain: record.domain,

            characters: record.characters as AdventureCharacter[],

            world: record.world as AdventureWorld,

            learningPlan: record.learningPlan as LearningPlanEntry[],

            emotionCurve: record.emotionCurve as EmotionCurvePoint[],

            genome: record.genome as StoryGenome,

            rootNodeId: record.rootNodeId,

            createdAt: record.createdAt.toISOString()

        };

    }

}
