import { EventScorer } from "../services/EventScorer";
import { CandidateEventGenerator } from "../services/CandidateEventGenerator";

function main(): void {

    const generator = new CandidateEventGenerator();

    const scorer = new EventScorer();

    const candidates = generator.generate({

        location: "the Whispering Wood",

        characters: [{ id: "fox", name: "Fenn", role: "guide", description: "" }],

        activeCharacterIds: ["fox"],

        domain: "ethics",

        turnIndex: 1

    });

    const baseContext = {

        skillFocus: ["leadership"],

        recentEventTypes: [],

        relevantMemories: [],

        emotionGuidance: { shouldReduceDifficulty: false, shouldIncreaseEncouragement: false, promptNote: "" },

        seed: 1234

    };

    // --- Reproducibility: same seed + same inputs -> same ranking ---

    const scoredA = scorer.score(candidates, baseContext);

    const scoredB = scorer.score(candidates, baseContext);

    console.assert(
        JSON.stringify(scoredA.map(s => s.event.id)) === JSON.stringify(scoredB.map(s => s.event.id)),
        "Expected identical seed+inputs to produce identical rankings"
    );

    // --- Different seed can change tie-breaking ---

    const scoredDifferentSeed = scorer.score(candidates, { ...baseContext, seed: 9999 });

    console.assert(
        scoredA[0].components.randomness !== scoredDifferentSeed[0].components.randomness ||
        scoredA.length === 1,
        "Expected the randomness component to vary with a different seed"
    );

    // --- learningRelevance: matching skillFocus should score the
    // matching event's learningRelevance component at 1 ---

    const leadershipEvent = scoredA.find(s => s.event.type === "led_team")!;

    console.assert(
        leadershipEvent.components.learningRelevance === 1,
        `Expected led_team's learningRelevance to be 1 when skillFocus includes 'leadership', got ${leadershipEvent.components.learningRelevance}`
    );

    const explorationEvent = scoredA.find(s => s.event.type === "explored")!;

    console.assert(
        explorationEvent.components.learningRelevance < 1,
        "Expected an unrelated event's learningRelevance to be below 1"
    );

    // --- repetitionPenalty: an event type seen recently should score lower ---

    const withRepetition = scorer.score(candidates, {
        ...baseContext,
        recentEventTypes: ["explored", "explored", "explored"]
    });

    const repeatedEvent = withRepetition.find(s => s.event.type === "explored")!;

    console.assert(
        repeatedEvent.components.repetitionPenalty === 1,
        `Expected full repetition penalty for an event type seen in every recent turn, got ${repeatedEvent.components.repetitionPenalty}`
    );

    // --- selectTop returns exactly N ---

    const top4 = scorer.selectTop(candidates, baseContext, 4);

    console.assert(top4.length === 4, `Expected selectTop(4) to return 4 items, got ${top4.length}`);

    console.log("EventScorer tests passed.");

}

main();
