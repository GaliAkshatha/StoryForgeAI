import { NarrativeStateTransition } from "../services/NarrativeStateTransition";
import { NarrativeState, PlotBeat } from "@storyforge/simulation-engine";

function baseState(overrides: Partial<NarrativeState> = {}): NarrativeState {

    const plotOutline: PlotBeat[] = [
        { beat: "hook", summary: "a fox needs help crossing the wood" },
        { beat: "complication", summary: "the usual path is blocked" },
        { beat: "moral_fork", summary: "decide whether to admit a mistake" },
        { beat: "test", summary: "someone else learns what really happened" },
        { beat: "resolution", summary: "trust is rebuilt" }
    ];

    return {

        location: "the wood",
        activeCharacterIds: ["fox"],
        currentGoal: "help the fox",
        currentProblem: plotOutline[0].summary,
        establishedFacts: [plotOutline[0].summary],
        unresolvedThreads: [],
        recentEventTypes: [],
        plotOutline,
        currentBeatIndex: 0,
        ...overrides

    };

}

function main(): void {

    const transition = new NarrativeStateTransition();

    // --- Opening phase: still at the hook beat ---

    const stillOpening = transition.advancePlotBeat(baseState(), "opening");

    console.assert(
        stillOpening.currentBeatIndex === 0 && stillOpening.currentProblem === "a fox needs help crossing the wood",
        `Expected to remain at beat 0 during opening, got index=${stillOpening.currentBeatIndex}`
    );

    // --- Development phase: advances to complication ---

    const developed = transition.advancePlotBeat(baseState(), "development");

    console.assert(
        developed.currentBeatIndex === 1 && developed.currentProblem === "the usual path is blocked",
        `Expected to advance to beat 1 (complication) at development phase, got index=${developed.currentBeatIndex} problem='${developed.currentProblem}'`
    );

    // --- Challenge phase: advances to the moral fork -- the heart
    // of the story ---

    const atForkPhase = transition.advancePlotBeat(baseState(), "challenge");

    console.assert(
        atForkPhase.currentBeatIndex === 2 && atForkPhase.currentProblem === "decide whether to admit a mistake",
        `Expected to reach the moral_fork beat at challenge phase, got index=${atForkPhase.currentBeatIndex}`
    );

    console.assert(
        atForkPhase.activeProblem?.type === "moral_fork" && atForkPhase.activeProblem.status === "active",
        "Expected activeProblem to reflect the moral_fork beat, structured and active"
    );

    // --- Climax phase: the test beat ---

    const atTest = transition.advancePlotBeat(baseState(), "climax");

    console.assert(
        atTest.currentBeatIndex === 3 && atTest.currentProblem === "someone else learns what really happened",
        `Expected the test beat at climax phase, got index=${atTest.currentBeatIndex}`
    );

    // --- Resolution phase: the final beat ---

    const atResolution = transition.advancePlotBeat(baseState(), "resolution");

    console.assert(
        atResolution.currentBeatIndex === 4 && atResolution.currentProblem === "trust is rebuilt",
        `Expected the resolution beat at resolution phase, got index=${atResolution.currentBeatIndex}`
    );

    // --- Never regresses: already at beat 2, a phase that maps
    // earlier must not move backward ---

    const alreadyAdvanced = baseState({ currentBeatIndex: 2, currentProblem: "decide whether to admit a mistake" });

    const stillAtFork = transition.advancePlotBeat(alreadyAdvanced, "development");

    console.assert(
        stillAtFork.currentBeatIndex === 2,
        `Expected the beat to never regress, got index=${stillAtFork.currentBeatIndex}`
    );

    // --- No plot outline at all (legacy/absent) -- returns state unchanged ---

    const noOutline = transition.advancePlotBeat(baseState({ plotOutline: undefined, currentBeatIndex: undefined }), "climax");

    console.assert(
        noOutline.currentBeatIndex === undefined,
        "Expected no change when there's no plot outline to advance through"
    );

    console.log("Plot beat advancement tests passed.");

}

main();
