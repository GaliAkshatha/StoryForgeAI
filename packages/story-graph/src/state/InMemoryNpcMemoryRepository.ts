import { NpcMemoryRepository } from "../interfaces/NpcMemoryRepository";
import { NpcMemoryEntry } from "../models/NpcMemory";

export class InMemoryNpcMemoryRepository implements NpcMemoryRepository {

    private readonly entries: NpcMemoryEntry[] = [];

    async record(
        entry: NpcMemoryEntry
    ): Promise<void> {

        this.entries.push(entry);

    }

    async findByCharacter(
        worldId: string,
        characterId: string
    ): Promise<NpcMemoryEntry[]> {

        return this.entries.filter(
            entry => entry.worldId === worldId && entry.characterId === characterId
        );

    }

    async findByWorldId(
        worldId: string
    ): Promise<NpcMemoryEntry[]> {

        return this.entries.filter(entry => entry.worldId === worldId);

    }

}
