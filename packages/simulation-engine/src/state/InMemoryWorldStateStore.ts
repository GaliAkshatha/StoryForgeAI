import { WorldStateStore } from "../interfaces/WorldStateStore";
import { WorldState } from "../models/WorldState";

// In-memory implementation. Swap for a database-backed
// implementation of WorldStateStore in production without touching
// the ConsequenceEngine or any agent -- they only depend on the
// interface.
export class InMemoryWorldStateStore implements WorldStateStore {

    private readonly states = new Map<string, WorldState>();

    async get(
        worldId: string
    ): Promise<WorldState | undefined> {

        return this.states.get(worldId);

    }

    async create(
        state: WorldState
    ): Promise<void> {

        if (this.states.has(state.worldId)) {

            throw new Error(
                `WorldState '${state.worldId}' already exists.`
            );

        }

        this.states.set(state.worldId, state);

    }

    async save(
        state: WorldState
    ): Promise<void> {

        this.states.set(state.worldId, state);

    }

}
