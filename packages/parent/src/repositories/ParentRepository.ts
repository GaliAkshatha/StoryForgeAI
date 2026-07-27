import { ParentProfile } from "../models/ParentProfile";

export interface ParentRepository {

    findByUserId(
        userId: string
    ): Promise<ParentProfile | undefined>;

    findById(
        id: string
    ): Promise<ParentProfile | undefined>;

    save(
        profile: ParentProfile
    ): Promise<void>;

}

export class InMemoryParentRepository implements ParentRepository {

    private readonly profilesById = new Map<string, ParentProfile>();

    private readonly idsByUserId = new Map<string, string>();

    async findByUserId(
        userId: string
    ): Promise<ParentProfile | undefined> {

        const id = this.idsByUserId.get(userId);

        return id ? this.profilesById.get(id) : undefined;

    }

    async findById(
        id: string
    ): Promise<ParentProfile | undefined> {

        return this.profilesById.get(id);

    }

    async save(
        profile: ParentProfile
    ): Promise<void> {

        this.profilesById.set(profile.id, profile);

        this.idsByUserId.set(profile.userId, profile.id);

    }

}
