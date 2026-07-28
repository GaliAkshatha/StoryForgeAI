import { EmotionRepository } from "../interfaces/EmotionRepository";
import { EmotionState } from "../models/EmotionState";
import { EmotionTrendService, EmotionGuidance } from "./EmotionTrendService";

// Phase 9: the facade AdventureRuntime actually depends on -- wraps
// persistence (EmotionRepository) and the deterministic math
// (EmotionTrendService, unchanged) into one call each for "record
// what just happened" and "tell me how to adapt."
export class EmotionTracker {

    constructor(
        private readonly repository: EmotionRepository,
        private readonly trend: EmotionTrendService = new EmotionTrendService()
    ) {}

    async record(
        state: EmotionState
    ): Promise<void> {

        await this.repository.record(state);

    }

    async guidance(
        sessionId: string,
        lookback = 3
    ): Promise<EmotionGuidance> {

        const recent = await this.repository.findRecentBySession(sessionId, lookback);

        return this.trend.guidance(recent.map(state => state.emotion));

    }

}
