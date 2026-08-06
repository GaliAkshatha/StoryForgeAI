import { PostgresAdventureRepository } from "../repositories/PostgresAdventureRepository";
import { Adventure } from "@storyforge/story-graph";

// This repository never had a dedicated round-trip test -- given
// two real production bugs already came from exactly this gap
// (fields silently dropped by Postgres mapping), this closes it,
// with explicit focus on plotOutline (the newest field).
class FakePrismaClient {

    private readonly rows = new Map<string, any>();

    adventureRecord = {

        findUnique: async ({ where }: { where: { id: string } }) => {

            return this.rows.get(where.id) ?? null;

        },

        upsert: async ({ where, create, update }: { where: { id: string }; create: any; update: any }) => {

            const row = this.rows.has(where.id) ? update : create;

            this.rows.set(where.id, row);

            return row;

        }

    };

}

function sampleAdventure(): Adventure {

    return {

        id: "adventure-1",

        childId: "child-1",

        title: "The Blocked Path",

        moral: "honesty matters",

        domain: "ethics",

        characters: [{ id: "squeak", name: "Squeak", role: "friend", description: "A small mouse." }],

        world: { setting: "forest", description: "A quiet forest path." },

        learningPlan: [{ skillFocus: "honesty", approach: "natural consequence" }],

        genome: {
            theme: "honesty", explorationLevel: 0.5, humor: 0.2, mystery: 0.2,
            fantasyDensity: 0.5, puzzleDensity: 0.3, npcComplexity: 0.3, vocabulary: "simple"
        },

        premise: "Squeak looks worried near a fallen branch",

        initialProblem: "a fallen branch blocks the path",

        plotOutline: [
            { beat: "hook", summary: "a friend needs help with a fallen branch" },
            { beat: "complication", summary: "the branch is heavier than expected" },
            { beat: "moral_fork", summary: "decide whether to admit a mistake" },
            { beat: "test", summary: "someone else learns what really happened" },
            { beat: "resolution", summary: "trust is rebuilt" }
        ],

        rootNodeId: "root",

        createdAt: new Date().toISOString()

    };

}

async function main(): Promise<void> {

    const repo = new PostgresAdventureRepository(new FakePrismaClient() as any);

    const adventure = sampleAdventure();

    await repo.save(adventure);

    const reread = await repo.findById("adventure-1");

    console.assert(
        reread !== undefined,
        "Expected the saved adventure to be retrievable"
    );

    console.assert(
        JSON.stringify(reread!.plotOutline) === JSON.stringify(adventure.plotOutline),
        `Expected plotOutline to survive the round trip unchanged, got '${JSON.stringify(reread!.plotOutline)}'`
    );

    console.assert(
        reread!.plotOutline.length === 5 &&
        reread!.plotOutline[2].beat === "moral_fork",
        "Expected all 5 beats, in order, to survive intact"
    );

    console.assert(
        reread!.initialProblem === adventure.initialProblem &&
        reread!.premise === adventure.premise,
        "Expected the other fields (already covered before, re-checked here) to also survive"
    );

    console.log("PostgresAdventureRepository regression test passed.");

}

main();
