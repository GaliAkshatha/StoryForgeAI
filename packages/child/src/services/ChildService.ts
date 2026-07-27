import {
    ChildProfile,
    CreateChildProfileInput
} from "../models/ChildProfile";

import { ChildRepository } from "../repositories/ChildRepository";

export class ChildService {

    constructor(
        private readonly children: ChildRepository
    ) {}

    async createProfile(
        input: CreateChildProfileInput
    ): Promise<ChildProfile> {

        const profile: ChildProfile = {

            id: crypto.randomUUID(),

            parentId: input.parentId,

            name: input.name,

            ageRange: input.ageRange,

            readingLevel: input.readingLevel,

            vocabularyLevel: input.vocabularyLevel,

            avatarId: input.avatarId,

            aboutChild: input.aboutChild,

            adventureWorldIds: [],

            createdAt: new Date().toISOString()

        };

        await this.children.save(profile);

        return profile;

    }

    async recordAdventureStarted(
        childId: string,
        worldId: string
    ): Promise<ChildProfile> {

        const profile = await this.requireProfile(childId);

        profile.adventureWorldIds.push(worldId);

        await this.children.save(profile);

        return profile;

    }

    async listForParent(
        parentId: string
    ): Promise<ChildProfile[]> {

        return this.children.findByParentId(parentId);

    }

    async getProfile(
        childId: string
    ): Promise<ChildProfile | undefined> {

        return this.children.findById(childId);

    }

    private async requireProfile(
        childId: string
    ): Promise<ChildProfile> {

        const profile = await this.children.findById(childId);

        if (!profile) {

            throw new Error(
                `Child profile '${childId}' not found.`
            );

        }

        return profile;

    }

}
