import { EmotionRepository } from "../interfaces/EmotionRepository";
import { EmotionState } from "../models/EmotionState";

export class InMemoryEmotionRepository implements EmotionRepository {

    private readonly records: EmotionState[] = [];

    async record(
        state: EmotionState
    ): Promise<void> {

        this.records.push(state);

    }

    async findByChildId(
        childId: string,
        limit?: number
    ): Promise<EmotionState[]> {

        const matches = this.records.filter(record => record.childId === childId);

        return limit ? matches.slice(-limit) : matches;

    }

    async findRecentBySession(
        sessionId: string,
        limit: number
    ): Promise<EmotionState[]> {

        return this.records

            .filter(record => record.sessionId === sessionId)

            .slice(-limit);

    }

}
