import { DeterministicAnalyticsEngine } from "../services/DeterministicAnalyticsEngine";

function main(): void {

    const engine = new DeterministicAnalyticsEngine();

    // --- Empty input produces no signals ---

    const empty = engine.score([]);

    console.assert(
        empty.length === 0,
        "Expected no signals for an empty event list"
    );

    // --- A single event produces signals for exactly its weighted traits ---

    const single = engine.score(["solved_puzzle"]);

    console.assert(
        single.length === 2 &&
        single.some(s => s.skill === "problem_solving") &&
        single.some(s => s.skill === "critical_thinking"),
        "Expected 'solved_puzzle' to produce problem_solving and critical_thinking signals"
    );

    const problemSolving = single.find(s => s.skill === "problem_solving")!;

    console.assert(
        Math.abs(problemSolving.delta - 0.7) < 1e-9,
        `Expected problem_solving delta to be exactly 0.7 for a single event, got ${problemSolving.delta}`
    );

    // --- Repeated events average, not accumulate unboundedly ---

    const repeated = engine.score(["led_team", "led_team", "led_team"]);

    const leadership = repeated.find(s => s.skill === "leadership")!;

    console.assert(
        Math.abs(leadership.delta - 0.8) < 1e-9,
        `Expected repeated identical events to average to the same per-event weight (0.8), got ${leadership.delta}`
    );

    // --- Mixed events with a negative weight ---

    const mixed = engine.score(["ignored_warning", "retried"]);

    const riskAssessment = mixed.find(s => s.skill === "risk_assessment")!;

    console.assert(
        riskAssessment.delta < 0,
        "Expected 'ignored_warning' to contribute a negative risk_assessment signal"
    );

    // --- Delta is always clamped to [-1, 1] ---

    const manyNegative = engine.score(Array(10).fill("ignored_warning"));

    const clampedRisk = manyNegative.find(s => s.skill === "risk_assessment")!;

    console.assert(
        clampedRisk.delta >= -1 && clampedRisk.delta <= 1,
        `Expected delta to stay within [-1, 1], got ${clampedRisk.delta}`
    );

    // --- Observation text is deterministic and human-readable ---

    console.assert(
        problemSolving.observation.includes("solved puzzle"),
        `Expected observation text to reference the underlying event, got: ${problemSolving.observation}`
    );

    // --- Results are sorted by signal strength ---

    const sorted = engine.score(["led_team", "failed_puzzle"]);

    console.assert(
        Math.abs(sorted[0].delta) >= Math.abs(sorted[sorted.length - 1].delta),
        "Expected signals sorted by descending absolute strength"
    );

    console.log("DeterministicAnalyticsEngine tests passed.");

}

main();
