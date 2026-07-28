import { NpcMemoryEntry } from "../models/NpcMemory";

export interface NpcMemoryRepository {

    record(
        entry: NpcMemoryEntry
    ): Promise<void>;

    findByCharacter(
        worldId: string,
        characterId: string
    ): Promise<NpcMemoryEntry[]>;

    findByWorldId(
        worldId: string
    ): Promise<NpcMemoryEntry[]>;

}
