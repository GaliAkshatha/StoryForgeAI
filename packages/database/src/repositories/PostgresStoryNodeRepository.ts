import { PrismaClient, Prisma } from "@prisma/client";

import {
    StoryNode,
    StoryNodeRepository,
    StoryChoice,
    EmotionProfile
} from "@storyforge/story-graph";

import { StateEffect } from "@storyforge/simulation-engine";
import { AdventureEventType } from "@storyforge/shared";
import { RenderRequest } from "@storyforge/llm-client";

interface StoryNodeRow {

    id: string;

    adventureId: string;

    narrative: string;

    choices: unknown;

    learningSignals: string[];

    emotion: unknown;

    effects: unknown;

    difficulty: number;

    readingLevel: string;

    isEnding: boolean;

    endingType: string | null;

    eventType: string | null;

    targetCharacterId: string | null;

    targetCharacterName: string | null;

    narrativeConsequence: string | null;

    characterIntroducedId: string | null;

    characterIntroducedName: string | null;

    threadIntroduced: string | null;

    threadResolved: string | null;

    // A nullable Json column reads back as Prisma.JsonValue | null --
    // never plain `unknown`, and never undefined (Prisma always
    // returns a real row field on a SELECT, it just may be SQL
    // NULL). Matches how the column is declared in schema.prisma
    // (`pendingRenderRequest Json?`, no default).
    pendingRenderRequest: Prisma.JsonValue | null;

    createdAt: Date;

}

export class PostgresStoryNodeRepository implements StoryNodeRepository {

    constructor(
        private readonly prisma: PrismaClient
    ) {}

    async findById(
        adventureId: string,
        nodeId: string
    ): Promise<StoryNode | undefined> {

        const record = await this.prisma.storyNodeRecord.findUnique({
            where: { adventureId_id: { adventureId, id: nodeId } }
        });

        return record ? this.toDomain(record) : undefined;

    }

    async findByAdventureId(
        adventureId: string
    ): Promise<StoryNode[]> {

        const records = await this.prisma.storyNodeRecord.findMany({
            where: { adventureId }
        });

        return records.map(record => this.toDomain(record));

    }

    async saveMany(
        nodes: StoryNode[]
    ): Promise<void> {

        if (nodes.length === 0) {
            return;
        }

        await this.prisma.storyNodeRecord.createMany({

            data: nodes.map(node => this.toRow(node)),

            skipDuplicates: true

        });

    }

    async updateNode(
        node: StoryNode
    ): Promise<void> {

        const row = this.toRow(node);

        await this.prisma.storyNodeRecord.upsert({

            where: { adventureId_id: { adventureId: node.adventureId, id: node.id } },

            create: row,

            update: row

        });

    }

    async count(
        adventureId: string
    ): Promise<number> {

        return this.prisma.storyNodeRecord.count({
            where: { adventureId }
        });

    }

    private toRow(
        node: StoryNode
    ) {

        return {

            id: node.id,

            adventureId: node.adventureId,

            narrative: node.narrative,

            choices: node.choices as unknown as object,

            learningSignals: node.learningSignals,

            emotion: node.emotion as unknown as object,

            effects: node.effects as unknown as object,

            difficulty: node.difficulty,

            readingLevel: node.readingLevel,

            isEnding: node.isEnding,

            endingType: node.endingType ?? null,

            eventType: node.eventType ?? null,

            targetCharacterId: node.targetCharacterId ?? null,

            targetCharacterName: node.targetCharacterName ?? null,

            pendingRenderRequest: node.pendingRenderRequest
                ? (node.pendingRenderRequest as unknown as Prisma.InputJsonValue)
                : Prisma.DbNull,

            narrativeConsequence: node.narrativeConsequence ?? null,

            characterIntroducedId: node.characterIntroducedId ?? null,

            characterIntroducedName: node.characterIntroducedName ?? null,

            threadIntroduced: node.threadIntroduced ?? null,

            threadResolved: node.threadResolved ?? null,

            createdAt: new Date(node.createdAt)

        };

    }

    private toDomain(
        record: StoryNodeRow
    ): StoryNode {

        return {

            id: record.id,

            adventureId: record.adventureId,

            narrative: record.narrative,

            choices: record.choices as StoryChoice[],

            learningSignals: record.learningSignals,

            emotion: record.emotion as EmotionProfile,

            effects: record.effects as StateEffect[],

            difficulty: record.difficulty,

            readingLevel: record.readingLevel,

            isEnding: record.isEnding,

            endingType: record.endingType ?? undefined,

            eventType: (record.eventType ?? undefined) as AdventureEventType | undefined,

            targetCharacterId: record.targetCharacterId ?? undefined,

            targetCharacterName: record.targetCharacterName ?? undefined,

            pendingRenderRequest: record.pendingRenderRequest !== null
                ? (record.pendingRenderRequest as unknown as RenderRequest)
                : undefined,

            narrativeConsequence: record.narrativeConsequence ?? undefined,

            characterIntroducedId: record.characterIntroducedId ?? undefined,

            characterIntroducedName: record.characterIntroducedName ?? undefined,

            threadIntroduced: record.threadIntroduced ?? undefined,

            threadResolved: record.threadResolved ?? undefined,

            createdAt: record.createdAt.toISOString()

        };

    }

}
