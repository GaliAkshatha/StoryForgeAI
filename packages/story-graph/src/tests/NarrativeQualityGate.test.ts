import { NarrativeQualityGate } from "../services/NarrativeQualityGate";

function main(): void {

    const gate = new NarrativeQualityGate();

    // --- The exact malformed examples from the browser report ---

    console.assert(
        !gate.isAcceptable("Ak gives Professor"),
        "Expected 'Ak gives Professor' to be rejected"
    );

    console.assert(
        !gate.isAcceptable("Ak gently pushes the"),
        "Expected 'Ak gently pushes the' to be rejected"
    );

    console.assert(
        !gate.isAcceptable("Ak bravely held"),
        "Expected 'Ak bravely held' to be rejected"
    );

    // --- Empty / whitespace-only ---

    console.assert(!gate.isAcceptable(""), "Expected empty string to be rejected");

    console.assert(!gate.isAcceptable("   "), "Expected whitespace-only string to be rejected");

    // --- Normal, complete narration must be accepted ---

    console.assert(
        gate.isAcceptable("Ak carefully lifts the branch and clears the path."),
        "Expected a normal complete sentence to be accepted"
    );

    console.assert(
        gate.isAcceptable("Squeak looks up, relieved."),
        "Expected a short but COMPLETE sentence (proper punctuation) to be accepted"
    );

    // --- Tiny/degenerate output ---

    console.assert(!gate.isAcceptable("Ak."), "Expected a 1-word fragment to be rejected");

    console.assert(!gate.isAcceptable("At the edge"), "Expected a real 3-token example from a prior session to be rejected");

    console.log("NarrativeQualityGate tests passed.");

}

main();
