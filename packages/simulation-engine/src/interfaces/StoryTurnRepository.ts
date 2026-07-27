import { StoryTurn } from "../models/StoryTurn";

export interface StoryTurnRepository {

    append(
        turn: StoryTurn
    ): Promise<void>;

    findBySessionId(
        sessionId: string
    ): Promise<StoryTurn[]>;

    findByWorldId(
        worldId: string
    ): Promise<StoryTurn[]>;

}
