import { ChildProfile } from "../models/ChildProfile";

export interface ChildRepository {

    findById(
        id: string
    ): Promise<ChildProfile | undefined>;

    findByParentId(
        parentId: string
    ): Promise<ChildProfile[]>;

    save(
        profile: ChildProfile
    ): Promise<void>;

}

export class InMemoryChildRepository implements ChildRepository {

    private readonly profilesById = new Map<string, ChildProfile>();

    async findById(
        id: string
    ): Promise<ChildProfile | undefined> {

        return this.profilesById.get(id);

    }

    async findByParentId(
        parentId: string
    ): Promise<ChildProfile[]> {

        return [...this.profilesById.values()].filter(
            profile => profile.parentId === parentId
        );

    }

    async save(
        profile: ChildProfile
    ): Promise<void> {

        this.profilesById.set(profile.id, profile);

    }

}
