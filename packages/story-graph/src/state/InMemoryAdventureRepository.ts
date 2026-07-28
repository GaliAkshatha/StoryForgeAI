import { AdventureRepository } from "../interfaces/AdventureRepository";
import { Adventure } from "../models/Adventure";

export class InMemoryAdventureRepository implements AdventureRepository {

    private readonly adventures = new Map<string, Adventure>();

    async findById(
        id: string
    ): Promise<Adventure | undefined> {

        return this.adventures.get(id);

    }

    async findByChildId(
        childId: string
    ): Promise<Adventure[]> {

        return [...this.adventures.values()].filter(
            adventure => adventure.childId === childId
        );

    }

    async save(
        adventure: Adventure
    ): Promise<void> {

        this.adventures.set(adventure.id, adventure);

    }

}
