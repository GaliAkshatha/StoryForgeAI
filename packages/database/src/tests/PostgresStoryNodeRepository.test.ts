import { PostgresStoryNodeRepository } from "../repositories/PostgresStoryNodeRepository";
import { StoryNode, neutralEmotionProfile } from "@storyforge/story-graph";

// Same fake-Prisma-client technique as PostgresWorldStateStore.test.ts
// -- runs the REAL PostgresStoryNodeRepository class (including its
// Prisma.DbNull/InputJsonValue boundary handling) against an
// in-memory-backed fake, so this is a genuine regression test for
// its toRow()/toDomain() mapping.
class FakePrismaClient {

    private readonly rows = new Map<string, any>();

    private key(adventureId: string, id: string): string {
        return `${adventureId}:${id}`;
    }

    storyNodeRecord = {

        findUnique: async ({ where }: { where: { adventureId_id: { adventureId: string; id: string } } }) => {

            return this.rows.get(this.key(where.adventureId_id.adventureId, where.adventureId_id.id)) ?? null;

        },

        createMany: async ({ data }: { data: any[] }) => {

            for (const row of data) {

                this.rows.set(this.key(row.adventureId, row.id), row);

            }

            return { count: data.length };

        },

        upsert: async ({ where, create, update }: { where: { adventureId_id: { adventureId: string; id: string } }; create: any; update: any }) => {

            const key = this.key(where.adventureId_id.adventureId, where.adventureId_id.id);

            const row = this.rows.has(key) ? update : create;

            this.rows.set(key, row);

            return row;

        }

    };

}

const SAMPLE_RENDER_REQUEST = {

    ageRange: "7-8",

    tone: "fantasy_adventure",

    maxSentences: 3,

    location: "the Whispering Wood",

    actorName: "Ari",

    eventType: "shared_resources",

    narrativeSeed: "shares something useful with Squeak",

    targetName: "Squeak",

    complexity: "rich" as const

};

function baseNode(id: string, overrides: Partial<StoryNode>): StoryNode {

    return {

        id,

        adventureId: "adventure-1",

        narrative: "",

        choices: [],

        learningSignals: ["collaboration"],

        emotion: neutralEmotionProfile(),

        effects: [],

        difficulty: 1,

        readingLevel: "7-8",

        isEnding: true,

        endingType: "quiet-victory",

        eventType: "shared_resources",

        targetCharacterId: "squeak",

        targetCharacterName: "Squeak",

        createdAt: new Date().toISOString(),

        ...overrides

    };

}

async function main(): Promise<void> {

    // =========================================================
    // CASE A x create: pendingRenderRequest PRESENT, via saveMany()
    // (the path DeterministicExpansionService's output actually
    // takes -- a freshly-expanded frontier node).
    // =========================================================

    {

        const repo = new PostgresStoryNodeRepository(new FakePrismaClient() as any);

        const node = baseNode("case-a-create", {
            narrative: "",
            pendingRenderRequest: SAMPLE_RENDER_REQUEST
        });

        await repo.saveMany([node]);

        const reread = await repo.findById("adventure-1", "case-a-create");

        console.assert(
            reread !== undefined,
            "CASE A x create: expected the saved node to be retrievable"
        );

        console.assert(
            reread!.pendingRenderRequest !== undefined,
            `CASE A x create: expected pendingRenderRequest to survive create+get, got '${reread!.pendingRenderRequest}'`
        );

        console.assert(
            JSON.stringify(reread!.pendingRenderRequest) === JSON.stringify(SAMPLE_RENDER_REQUEST),
            "CASE A x create: expected pendingRenderRequest's full contents to survive unchanged"
        );

        console.assert(
            reread!.narrative === "",
            "CASE A x create: expected narrative to remain empty while a render is pending"
        );

    }

    // =========================================================
    // CASE B x create: pendingRenderRequest ABSENT, via saveMany()
    // (a node that was already rendered before ever being persisted
    // -- e.g. the root node, after ensureRendered() ran but before
    // its FIRST save -- or any already-rendered node in general).
    // =========================================================

    {

        const repo = new PostgresStoryNodeRepository(new FakePrismaClient() as any);

        const node = baseNode("case-b-create", {
            narrative: "Ari shares something with Squeak.",
            pendingRenderRequest: undefined
        });

        await repo.saveMany([node]);

        const reread = await repo.findById("adventure-1", "case-b-create");

        console.assert(
            reread !== undefined,
            "CASE B x create: expected the saved node to be retrievable"
        );

        console.assert(
            reread!.pendingRenderRequest === undefined,
            `CASE B x create: expected pendingRenderRequest to be absent (not invented), got '${JSON.stringify(reread!.pendingRenderRequest)}'`
        );

        console.assert(
            reread!.narrative === "Ari shares something with Squeak.",
            "CASE B x create: expected the real narrative to survive create+get"
        );

    }

    // =========================================================
    // CASE A x save: pendingRenderRequest PRESENT, via updateNode()
    // (less common in practice, but the mapping must be symmetric --
    // updateNode() and saveMany() share the same toRow()).
    // =========================================================

    {

        const repo = new PostgresStoryNodeRepository(new FakePrismaClient() as any);

        const initial = baseNode("case-a-save", { narrative: "temporary", pendingRenderRequest: undefined });

        await repo.saveMany([initial]);

        const withPending: StoryNode = { ...initial, narrative: "", pendingRenderRequest: SAMPLE_RENDER_REQUEST };

        await repo.updateNode(withPending);

        const reread = await repo.findById("adventure-1", "case-a-save");

        console.assert(
            reread!.pendingRenderRequest !== undefined &&
            JSON.stringify(reread!.pendingRenderRequest) === JSON.stringify(SAMPLE_RENDER_REQUEST),
            `CASE A x save: expected pendingRenderRequest to survive save+get, got '${JSON.stringify(reread!.pendingRenderRequest)}'`
        );

    }

    // =========================================================
    // CASE B x save: pendingRenderRequest ABSENT, via updateNode()
    // -- THE actual real-world path: NarrationRenderingService
    // .ensureRendered() clearing pendingRenderRequest once a node
    // has been rendered.
    // =========================================================

    {

        const repo = new PostgresStoryNodeRepository(new FakePrismaClient() as any);

        const initial = baseNode("case-b-save", { narrative: "", pendingRenderRequest: SAMPLE_RENDER_REQUEST });

        await repo.saveMany([initial]);

        const rendered: StoryNode = { ...initial, narrative: "Ari shares something with Squeak.", pendingRenderRequest: undefined };

        await repo.updateNode(rendered);

        const reread = await repo.findById("adventure-1", "case-b-save");

        console.assert(
            reread!.narrative === "Ari shares something with Squeak.",
            `CASE B x save: expected the rendered narrative to persist, got '${reread!.narrative}'`
        );

        console.assert(
            reread!.pendingRenderRequest === undefined,
            `CASE B x save: expected pendingRenderRequest to be cleared once rendered, got '${JSON.stringify(reread!.pendingRenderRequest)}'`
        );

        console.assert(
            reread!.eventType === "shared_resources" &&
            reread!.targetCharacterId === "squeak" &&
            reread!.targetCharacterName === "Squeak",
            "CASE B x save: expected eventType/targetCharacterId/targetCharacterName to also survive the round trip"
        );

    }

    // =========================================================
    // Phase 2A: narrativeConsequence/threadIntroduced/threadResolved
    // round trip -- same class of bug as pendingRenderRequest before
    // (plain String? columns this time, not Json, but still never
    // covered by InMemoryStoryNodeRepository-only tests).
    // =========================================================

    {

        const repo = new PostgresStoryNodeRepository(new FakePrismaClient() as any);

        const node = baseNode("phase2a-node", {

            narrativeConsequence: "Squeak is relieved -- the branch is finally moved",

            threadIntroduced: "a caution noticed while exploring the clearing",

            threadResolved: "an unfinished attempt at crossing the stream"

        });

        await repo.saveMany([node]);

        const reread = await repo.findById("adventure-1", "phase2a-node");

        console.assert(
            reread!.narrativeConsequence === "Squeak is relieved -- the branch is finally moved",
            `Expected narrativeConsequence to survive create+get, got '${reread!.narrativeConsequence}'`
        );

        console.assert(
            reread!.threadIntroduced === "a caution noticed while exploring the clearing",
            `Expected threadIntroduced to survive create+get, got '${reread!.threadIntroduced}'`
        );

        console.assert(
            reread!.threadResolved === "an unfinished attempt at crossing the stream",
            `Expected threadResolved to survive create+get, got '${reread!.threadResolved}'`
        );

        // Absent case -- must not be invented.
        const plainNode = baseNode("phase2a-plain", {});

        await repo.saveMany([plainNode]);

        const rereadPlain = await repo.findById("adventure-1", "phase2a-plain");

        console.assert(
            rereadPlain!.narrativeConsequence === undefined &&
            rereadPlain!.threadIntroduced === undefined &&
            rereadPlain!.threadResolved === undefined,
            "Expected absent narrativeConsequence/threadIntroduced/threadResolved to stay absent, not be invented"
        );

    }

    console.log("PostgresStoryNodeRepository regression test passed.");

}

main();
