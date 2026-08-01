import { ChoiceCountPolicy } from "../services/ChoiceCountPolicy";

function main(): void {

    const policy = new ChoiceCountPolicy();

    console.assert(
        policy.determine(0) === 0,
        "Expected 0 valid candidates to yield 0 choices (never padded)"
    );

    console.assert(
        policy.determine(1) === 1,
        "Expected 1 valid candidate to yield 1 choice (below MIN is allowed when constraints genuinely leave fewer)"
    );

    console.assert(
        policy.determine(2) === 2,
        "Expected 2 valid candidates to yield 2 choices"
    );

    console.assert(
        policy.determine(3) === 3,
        "Expected 3 valid candidates to yield 3 choices"
    );

    console.assert(
        policy.determine(4) === 3,
        "Expected 4+ valid candidates to be capped at NORMAL_MAX (3), not padded to 4"
    );

    console.assert(
        policy.determine(10) === 3,
        "Expected a large valid candidate pool to still cap at 3"
    );

    console.log("ChoiceCountPolicy tests passed.");

}

main();
