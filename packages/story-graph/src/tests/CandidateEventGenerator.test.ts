import { CandidateEventGenerator } from "../services/CandidateEventGenerator";

function main(): void {

    const generator = new CandidateEventGenerator();

    const context = {

        location: "the Whispering Wood",

        characters: [{ id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." }],

        activeCharacterIds: ["fox"],

        domain: "ethics",

        turnIndex: 2

    };

    const first = generator.generate(context);

    const second = generator.generate(context);

    console.assert(
        JSON.stringify(first) === JSON.stringify(second),
        "Expected identical context to produce identical candidates (determinism)"
    );

    console.assert(
        first.length === 10,
        `Expected 10 candidates (one per AdventureEventType), got ${first.length}`
    );

    console.assert(
        first.every(candidate => candidate.narrativeSeed.length > 0),
        "Expected every candidate to have a non-empty narrativeSeed"
    );

    console.assert(
        first.every(candidate => typeof candidate.complexity === "string"),
        "Expected every candidate to have a complexity tag"
    );

    const helpNpc = first.find(c => c.type === "helped_npc")!;

    console.assert(
        helpNpc.targetName === "Fenn",
        `Expected helped_npc to target the only available character, got ${helpNpc.targetName}`
    );

    console.assert(
        helpNpc.relationshipEffects.length === 1 && helpNpc.relationshipEffects[0].characterId === "fox",
        "Expected helped_npc to carry a relationship effect toward the target"
    );

    const different = generator.generate({ ...context, location: "a different place" });

    console.assert(
        JSON.stringify(different) !== JSON.stringify(first),
        "Expected a different location to change generated candidates (location-dependent narrativeSeed)"
    );

    console.log("CandidateEventGenerator tests passed.");

}

main();
