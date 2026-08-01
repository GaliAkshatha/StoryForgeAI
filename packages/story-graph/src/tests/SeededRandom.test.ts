import { SeededRandom } from "../services/SeededRandom";

function main(): void {

    const a = new SeededRandom(42);

    const b = new SeededRandom(42);

    const sequenceA = [a.next(), a.next(), a.next()];

    const sequenceB = [b.next(), b.next(), b.next()];

    console.assert(
        JSON.stringify(sequenceA) === JSON.stringify(sequenceB),
        `Expected identical sequences for the same seed, got ${sequenceA} vs ${sequenceB}`
    );

    const c = new SeededRandom(43);

    const sequenceC = [c.next(), c.next(), c.next()];

    console.assert(
        JSON.stringify(sequenceA) !== JSON.stringify(sequenceC),
        "Expected different seeds to (almost certainly) produce different sequences"
    );

    for (const value of sequenceA) {

        console.assert(value >= 0 && value < 1, `Expected value in [0,1), got ${value}`);

    }

    console.assert(
        SeededRandom.seedFromString("world-1:3") === SeededRandom.seedFromString("world-1:3"),
        "Expected seedFromString to be deterministic for the same input"
    );

    console.assert(
        SeededRandom.seedFromString("world-1:3") !== SeededRandom.seedFromString("world-1:4"),
        "Expected different strings to produce different seeds"
    );

    console.log("SeededRandom tests passed.");

}

main();
