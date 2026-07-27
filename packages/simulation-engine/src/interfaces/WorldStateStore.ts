import { WorldState } from "../models/WorldState";

export interface WorldStateStore {

    get(
        worldId: string
    ): Promise<WorldState | undefined>;

    create(
        state: WorldState
    ): Promise<void>;

    save(
        state: WorldState
    ): Promise<void>;

}
