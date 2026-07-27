import { StoryTurnRepository } from "../interfaces/StoryTurnRepository";
import { StoryTurn } from "../models/StoryTurn";

export class InMemoryStoryTurnRepository implements StoryTurnRepository {

    private readonly turns: StoryTurn[] = [];

    async append(
        turn: StoryTurn
    ): Promise<void> {

        this.turns.push(turn);

    }

    async findBySessionId(
        sessionId: string
    ): Promise<StoryTurn[]> {

        return this.turns.filter(turn => turn.sessionId === sessionId);

    }

    async findByWorldId(
        worldId: string
    ): Promise<StoryTurn[]> {

        return this.turns.filter(turn => turn.worldId === worldId);

    }

}
