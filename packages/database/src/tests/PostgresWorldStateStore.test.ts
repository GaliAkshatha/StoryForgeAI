import { PostgresWorldStateStore } from "../repositories/PostgresWorldStateStore";
import { createInitialWorldState, initialChapterState } from "@storyforge/simulation-engine";

// A minimal fake Prisma client backing worldStateRecord with an
// in-memory Map -- NOT a reimplementation of PostgresWorldStateStore
// itself, just enough of Prisma's delegate shape (findUnique/create/
// upsert) for the REAL PostgresWorldStateStore class to run against.
// This is what makes this a genuine regression test for the mapping
// logic (toRow/toDomain), not a test of a separate mock.
class FakePrismaClient {

    private readonly rows = new Map<string, any>();

    worldStateRecord = {

        findUnique: async ({ where }: { where: { worldId: string } }) => {

            return this.rows.get(where.worldId) ?? null;

        },

        create: async ({ data }: { data: any }) => {

            if (this.rows.has(data.worldId)) {

                throw new Error(`WorldState '${data.worldId}' already exists.`);

            }

            this.rows.set(data.worldId, data);

            return data;

        },

        upsert: async ({ where, create, update }: { where: { worldId: string }; create: any; update: any }) => {

            const row = this.rows.has(where.worldId) ? update : create;

            this.rows.set(where.worldId, row);

            return row;

        }

    };

}

async function main(): Promise<void> {

    const prisma = new FakePrismaClient();

    const store = new PostgresWorldStateStore(prisma as any);

    const initial = createInitialWorldState({

        worldId: "world-regression-1",

        childId: "child-1",

        location: "the Whispering Wood",

        moral: "honesty",

        domain: "ethics"

    });

    const withGraphPosition = {

        ...initial,

        adventureId: "adventure-abc",

        currentNodeId: "root"

    };

    await store.create(withGraphPosition);

    const reread = await store.get("world-regression-1");

    console.assert(
        reread !== undefined,
        "Expected the created WorldState to be retrievable"
    );

    console.assert(
        reread!.adventureId === "adventure-abc",
        `Expected adventureId to survive a create+get round trip, got '${reread!.adventureId}'`
    );

    console.assert(
        reread!.currentNodeId === "root",
        `Expected currentNodeId to survive a create+get round trip, got '${reread!.currentNodeId}'`
    );

    const advanced = { ...reread!, currentNodeId: "mid", turn: reread!.turn + 1 };

    await store.save(advanced);

    const rereadAfterSave = await store.get("world-regression-1");

    console.assert(
        rereadAfterSave!.currentNodeId === "mid",
        `Expected currentNodeId to update correctly after save(), got '${rereadAfterSave!.currentNodeId}'`
    );

    console.assert(
        rereadAfterSave!.adventureId === "adventure-abc",
        "Expected adventureId to remain stable across a save() that only changes currentNodeId"
    );

    // =========================================================
    // chapterState round trip (Section B correction pass) -- the
    // exact class of bug that broke pendingRenderRequest and
    // adventureId/currentNodeId before: a domain field added without
    // updating this mapper. Tested explicitly per instruction, not
    // assumed safe because "the pattern is already established."
    // =========================================================

    // CASE: chapterState present at create()
    const withChapterState = {

        ...createInitialWorldState({
            worldId: "world-regression-2", childId: "child-1",
            location: "the Whispering Wood", moral: "honesty", domain: "ethics"
        }),

        chapterState: initialChapterState()

    };

    await store.create(withChapterState);

    const rereadChapter = await store.get("world-regression-2");

    console.assert(
        rereadChapter!.chapterState !== undefined,
        `Expected chapterState to survive a create+get round trip, got '${JSON.stringify(rereadChapter!.chapterState)}'`
    );

    console.assert(
        JSON.stringify(rereadChapter!.chapterState) === JSON.stringify(initialChapterState()),
        "Expected chapterState's full contents to survive the round trip unchanged"
    );

    // CASE: chapterState updated via save()
    const advancedChapter = {

        ...rereadChapter!,

        chapterState: { turn: 3, phase: "development" as const, meaningfulEvents: 2, climaxReached: false }

    };

    await store.save(advancedChapter);

    const rereadAfterChapterSave = await store.get("world-regression-2");

    console.assert(
        JSON.stringify(rereadAfterChapterSave!.chapterState) === JSON.stringify(advancedChapter.chapterState),
        `Expected chapterState to update correctly after save(), got '${JSON.stringify(rereadAfterChapterSave!.chapterState)}'`
    );

    // CASE: chapterState absent (undefined) at create() -- must not
    // be invented on read, and must not break the round trip of
    // everything else.
    const withoutChapterState = createInitialWorldState({
        worldId: "world-regression-3", childId: "child-1",
        location: "the Whispering Wood", moral: "honesty", domain: "ethics"
    });

    await store.create(withoutChapterState);

    const rereadNoChapter = await store.get("world-regression-3");

    console.assert(
        rereadNoChapter!.chapterState === undefined,
        `Expected chapterState to be absent (not invented), got '${JSON.stringify(rereadNoChapter!.chapterState)}'`
    );

    // =========================================================
    // narrativeState round trip (Phase 2A) -- same rigor as
    // chapterState above. Tested explicitly, not assumed safe.
    // =========================================================

    const seededNarrativeState = {

        location: "the Whispering Wood",

        activeCharacterIds: ["fox"],

        currentGoal: "figure out what's happening",

        currentProblem: "a mystery near the stream",

        establishedFacts: ["a mystery near the stream"],

        unresolvedThreads: [] as string[],

        recentEventTypes: [] as import("@storyforge/shared").AdventureEventType[]

    };

    const withNarrativeState = {

        ...createInitialWorldState({
            worldId: "world-regression-4", childId: "child-1",
            location: "the Whispering Wood", moral: "honesty", domain: "ethics"
        }),

        narrativeState: seededNarrativeState

    };

    await store.create(withNarrativeState);

    const rereadNarrative = await store.get("world-regression-4");

    console.assert(
        rereadNarrative!.narrativeState !== undefined,
        `Expected narrativeState to survive a create+get round trip, got '${JSON.stringify(rereadNarrative!.narrativeState)}'`
    );

    console.assert(
        JSON.stringify(rereadNarrative!.narrativeState) === JSON.stringify(seededNarrativeState),
        "Expected narrativeState's full contents to survive the round trip unchanged"
    );

    // CASE: narrativeState updated via save()
    const advancedNarrative = {

        ...rereadNarrative!,

        narrativeState: {

            ...seededNarrativeState,

            activeCharacterIds: ["fox", "owl"],

            currentProblem: undefined,

            establishedFacts: [...seededNarrativeState.establishedFacts, "the fox helped find the way"]

        }

    };

    await store.save(advancedNarrative);

    const rereadAfterNarrativeSave = await store.get("world-regression-4");

    console.assert(
        JSON.stringify(rereadAfterNarrativeSave!.narrativeState) === JSON.stringify(advancedNarrative.narrativeState),
        `Expected narrativeState to update correctly after save(), got '${JSON.stringify(rereadAfterNarrativeSave!.narrativeState)}'`
    );

    // CASE: narrativeState absent
    const withoutNarrativeState = createInitialWorldState({
        worldId: "world-regression-5", childId: "child-1",
        location: "the Whispering Wood", moral: "honesty", domain: "ethics"
    });

    await store.create(withoutNarrativeState);

    const rereadNoNarrative = await store.get("world-regression-5");

    console.assert(
        rereadNoNarrative!.narrativeState === undefined,
        `Expected narrativeState to be absent (not invented), got '${JSON.stringify(rereadNoNarrative!.narrativeState)}'`
    );

    console.log("PostgresWorldStateStore regression test passed.");

}

main();
