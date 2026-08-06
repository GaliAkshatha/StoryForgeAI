import { EventScorer } from "../services/EventScorer";
import { CandidateEvent } from "../models/CandidateEvent";

// Structural-issue audit: before this, NarrativeState.plotOutline
// only ever changed DISPLAY text -- it had ZERO influence on which
// of the ~10 generic event types actually got selected each turn,
// which is why the story's plot arc read as decoration rather than
// something that actually shaped gameplay. This proves the fix: at
// the moral_fork beat, a character-interaction event now scores
// higher than a generic look-around, holding everything else equal.

function candidate(type: CandidateEvent["type"]): CandidateEvent {

    return {

        id: type, type, prerequisites: [], effects: [],
        learningTags: [], emotionalEffects: {}, relationshipEffects: [],
        narrativeSeed: "does something", complexity: "trivial", isEnding: true

    };

}

function main(): void {

    const scorer = new EventScorer();

    const candidates = [candidate("observed"), candidate("helped_npc")];

    const baseContext = {

        skillFocus: [], recentEventTypes: [], relevantMemories: [],
        emotionGuidance: { shouldReduceDifficulty: false, shouldIncreaseEncouragement: false, promptNote: "" },
        seed: 1

    };

    // --- No plot beat at all: neutral, no bias either way ---

    const noBeat = scorer.score(candidates, baseContext);

    console.assert(
        noBeat.every(c => c.components.beatAlignment === 0.5),
        `Expected neutral beatAlignment (0.5) with no active beat, got ${JSON.stringify(noBeat.map(c => c.components.beatAlignment))}`
    );

    // --- At the moral_fork beat: helped_npc (a character-interaction
    // event, aligned with this beat) must score its beatAlignment
    // component higher than observed (not aligned). ---

    const atMoralFork = scorer.score(candidates, { ...baseContext, currentPlotBeat: "moral_fork" });

    const helpedNpc = atMoralFork.find(c => c.event.type === "helped_npc")!;

    const observed = atMoralFork.find(c => c.event.type === "observed")!;

    console.assert(
        helpedNpc.components.beatAlignment > observed.components.beatAlignment,
        `Expected helped_npc (aligned with moral_fork) to score higher on beatAlignment than observed, got helped_npc=${helpedNpc.components.beatAlignment} observed=${observed.components.beatAlignment}`
    );

    // --- At the hook beat: the alignment flips (observed IS aligned
    // with hook, helped_npc isn't) -- proving this isn't just "helped_npc
    // always wins", it genuinely depends on which beat is active. ---

    const atHook = scorer.score(candidates, { ...baseContext, currentPlotBeat: "hook" });

    const observedAtHook = atHook.find(c => c.event.type === "observed")!;

    const helpedNpcAtHook = atHook.find(c => c.event.type === "helped_npc")!;

    console.assert(
        observedAtHook.components.beatAlignment > helpedNpcAtHook.components.beatAlignment,
        `Expected the alignment to flip at a different beat (observed aligned with hook), got observed=${observedAtHook.components.beatAlignment} helped_npc=${helpedNpcAtHook.components.beatAlignment}`
    );

    console.log("Beat alignment tests passed.");

}

main();
