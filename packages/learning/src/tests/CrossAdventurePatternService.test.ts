import { CrossAdventurePatternService } from "../services/CrossAdventurePatternService";
import { InMemoryLearningRepository } from "../repositories/LearningRepository";
import { LearningAnalytics } from "@storyforge/shared";

function analytics(overrides: Partial<LearningAnalytics>): LearningAnalytics {

    return {

        sessionId: "session-1",
        childId: "child-1",
        skillSignals: [],
        behaviorNotes: [],
        summary: "",
        generatedAt: new Date().toISOString(),
        ...overrides

    };

}

async function main(): Promise<void> {

    // --- A single occurrence is NOT a pattern -- must not appear ---

    {

        const repo = new InMemoryLearningRepository();

        await repo.save(analytics({
            skillSignals: [{ skill: "empathy", observation: "asked why", delta: 0.6 }],
            behaviorNotes: ["Asked Bramble why he took the lantern before deciding what to do."]
        }));

        const service = new CrossAdventurePatternService(repo);

        const patterns = await service.getPatterns("child-1");

        console.assert(
            patterns.length === 0,
            `Expected no pattern from a single occurrence, got ${JSON.stringify(patterns)}`
        );

    }

    // --- Repeated occurrences across adventures DO form a real pattern ---

    {

        const repo = new InMemoryLearningRepository();

        await repo.save(analytics({
            generatedAt: "2026-01-01T00:00:00.000Z",
            skillSignals: [{ skill: "empathy", observation: "asked why", delta: 0.6 }],
            behaviorNotes: ["Asked Bramble why he took the lantern before deciding what to do."]
        }));

        await repo.save(analytics({
            generatedAt: "2026-01-02T00:00:00.000Z",
            skillSignals: [{ skill: "empathy", observation: "asked why", delta: 0.5 }],
            behaviorNotes: ["Asked Captain Barnaby what really happened before confronting him."]
        }));

        await repo.save(analytics({
            generatedAt: "2026-01-03T00:00:00.000Z",
            skillSignals: [{ skill: "persistence", observation: "retried", delta: 0.7 }],
            behaviorNotes: ["Tried again after the first attempt to fix the lantern failed."]
        }));

        const service = new CrossAdventurePatternService(repo);

        const patterns = await service.getPatterns("child-1");

        const empathyPattern = patterns.find(p => p.skill === "empathy");

        console.assert(
            empathyPattern !== undefined,
            `Expected a real empathy pattern to be detected, got ${JSON.stringify(patterns)}`
        );

        console.assert(
            empathyPattern?.timesObserved === 2,
            `Expected empathy observed exactly twice, got ${empathyPattern?.timesObserved}`
        );

        console.assert(
            empathyPattern?.label === "Perspective-Taking",
            `Expected the real trait copy label, got '${empathyPattern?.label}'`
        );

        console.assert(
            empathyPattern?.whatWeObserved.includes("2 of your last 3 adventures"),
            `Expected the evidence-first "what we observed" copy to state the real ratio, got '${empathyPattern?.whatWeObserved}'`
        );

        // Recent example should come from the MOST RECENT matching
        // adventure (2026-01-02), not the older one.
        console.assert(
            empathyPattern?.recentExample?.includes("Captain Barnaby"),
            `Expected the most recent matching example, got '${empathyPattern?.recentExample}'`
        );

        console.assert(
            (empathyPattern?.encouragementPrompt.length ?? 0) > 0,
            "Expected a real encouragement prompt, not empty"
        );

    }

    // --- A weak/incidental signal (below the observation threshold)
    // must not count toward a pattern ---

    {

        const repo = new InMemoryLearningRepository();

        await repo.save(analytics({
            generatedAt: "2026-01-01T00:00:00.000Z",
            skillSignals: [{ skill: "empathy", observation: "weak signal", delta: 0.05 }]
        }));

        await repo.save(analytics({
            generatedAt: "2026-01-02T00:00:00.000Z",
            skillSignals: [{ skill: "empathy", observation: "weak signal", delta: 0.05 }]
        }));

        const service = new CrossAdventurePatternService(repo);

        const patterns = await service.getPatterns("child-1");

        console.assert(
            patterns.length === 0,
            `Expected weak signals below the threshold to never form a pattern, got ${JSON.stringify(patterns)}`
        );

    }

    // --- No adventures at all -- must not throw ---

    {

        const repo = new InMemoryLearningRepository();

        const service = new CrossAdventurePatternService(repo);

        const patterns = await service.getPatterns("child-with-no-history");

        console.assert(
            patterns.length === 0,
            "Expected an empty (not thrown) result for a child with no adventure history"
        );

    }

    console.log("CrossAdventurePatternService tests passed.");

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
