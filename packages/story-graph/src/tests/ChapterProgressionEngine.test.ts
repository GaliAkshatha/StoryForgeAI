import { ChapterProgressionEngine } from "../services/ChapterProgressionEngine";
import { initialChapterState } from "@storyforge/simulation-engine";

function main(): void {

    const engine = new ChapterProgressionEngine();

    const opening = initialChapterState();

    console.assert(
        opening.phase === "opening" && opening.turn === 0,
        "Expected the initial chapter state to be turn 0, opening"
    );

    console.assert(
        !engine.canEnd(opening),
        "Expected the opening phase to never be end-eligible"
    );

    const afterTurn1 = engine.advance(opening, true);

    console.assert(
        !engine.canEnd(afterTurn1),
        "Expected the chapter not to be end-eligible after just one turn"
    );

    console.assert(
        afterTurn1.phase !== "opening",
        "Expected the phase to move on from opening after turn 1"
    );

    let state = opening;

    for (let i = 0; i < 2; i++) {

        state = engine.advance(state, true);

        console.assert(
            !state.climaxReached,
            `Expected climax not to be reached after only ${state.meaningfulEvents} meaningful events`
        );

    }

    state = engine.advance(state, true);

    console.assert(
        state.climaxReached && state.phase === "climax",
        `Expected climax to be reached and phase=climax after 3 meaningful events, got phase=${state.phase} climaxReached=${state.climaxReached}`
    );

    console.assert(
        !engine.canEnd(state),
        "Expected climax phase itself to not yet be end-eligible (must reach resolution)"
    );

    state = engine.advance(state, true);

    console.assert(
        state.phase === "resolution",
        `Expected the phase after climax to be resolution, got ${state.phase}`
    );

    console.assert(
        engine.canEnd(state),
        "Expected resolution phase (with climax already reached and sufficient turns) to be end-eligible"
    );

    const quietTurn = engine.advance(initialChapterState(), false);

    console.assert(
        quietTurn.meaningfulEvents === 0 && quietTurn.turn === 1,
        "Expected a non-meaningful turn to advance turn but not meaningfulEvents"
    );

    const a = engine.advance(opening, true);

    const b = engine.advance(opening, true);

    console.assert(
        JSON.stringify(a) === JSON.stringify(b),
        "Expected advance() to be a pure deterministic function of its inputs"
    );

    const stillResolution = engine.advance(state, true);

    console.assert(
        stillResolution.phase === "resolution",
        "Expected resolution to remain resolution on further turns"
    );

    console.log("ChapterProgressionEngine tests passed.");

}

main();
