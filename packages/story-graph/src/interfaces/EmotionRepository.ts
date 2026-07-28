import { EmotionState } from "../models/EmotionState";

export interface EmotionRepository {

    record(
        state: EmotionState
    ): Promise<void>;

    findByChildId(
        childId: string,
        limit?: number
    ): Promise<EmotionState[]>;

    findRecentBySession(
        sessionId: string,
        limit: number
    ): Promise<EmotionState[]>;

}
