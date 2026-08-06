import { EventScorer } from "../services/EventScorer";
import { CandidateEvent } from "../models/CandidateEvent";

// "Deck of cards" mechanic (Kreminski's storylet survey, via Fallen
// London/StoryNexus): a storylet highly relevant to current state
// should be noticeably more likely to surface, not just equally
// eligible. Proves: an open unresolved thread makes the event type
// that would engage it score higher, and -- critically -- that this
// bonus does NOT apply when there's no open thread at all (it's
// relevance-driven, not a permanent bias toward "retried").

function candidate(type: CandidateEvent["type"]): CandidateEvent {

    return {

        id: type, type, prerequisites: [], effects: [],
        learningTags: [], emotionalEffects: {}, relationshipEffects: [],
        narrativeSeed: "does something", complexity: "trivial", isEnding: true

    };

}

function main(): void {

    const scorer = new EventScorer();

    const candidates = [candidate("retried"), candidate("explored")];

    const baseContext = {

        skillFocus: [], recentEventTypes: [], relevantMemories: [],
        emotionGuidance: { shouldReduceDifficulty: false, shouldIncreaseEncouragement: false, promptNote: "" },
        seed: 1

    };

    // --- No open thread: neutral, no bias ---

    const noThread = scorer.score(candidates, baseContext);

    console.assert(
        noThread.every(c => c.components.threadRelevance === 0.5),
        `Expected neutral threadRelevance (0.5) with no open thread, got ${JSON.stringify(noThread.map(c => c.components.threadRelevance))}`
    );

    // --- An open thread exists: retried (which engages it) scores
    // higher on threadRelevance than explored (which doesn't) ---

    const withThread = scorer.score(candidates, {
        ...baseContext,
        unresolvedThreads: ["an unfinished attempt at moving the branch"]
    });

    const retried = withThread.find(c => c.event.type === "retried")!;

    const explored = withThread.find(c => c.event.type === "explored")!;

    console.assert(
        retried.components.threadRelevance > explored.components.threadRelevance,
        `Expected retried (engages the open thread) to score higher on threadRelevance than explored, got retried=${retried.components.threadRelevance} explored=${explored.components.threadRelevance}`
    );

    // --- The bonus is genuinely conditional on an open thread
    // existing -- retried's threadRelevance must differ between the
    // two scenarios above, not just always be high. ---

    const retriedNoThread = noThread.find(c => c.event.type === "retried")!;

    console.assert(
        retried.components.threadRelevance > retriedNoThread.components.threadRelevance,
        "Expected retried's threadRelevance to actually depend on a thread being open, not be a fixed bias"
    );

    console.log("Thread relevance (deck of cards) tests passed.");

}

main();
