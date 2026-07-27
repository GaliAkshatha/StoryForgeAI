import {
    ParentProfile,
    createDefaultSettings,
    ParentSettings
} from "../models/ParentProfile";

import { ParentRepository } from "../repositories/ParentRepository";

export class ParentService {

    constructor(
        private readonly parents: ParentRepository
    ) {}

    async createProfile(
        userId: string,
        displayName: string
    ): Promise<ParentProfile> {

        const existing = await this.parents.findByUserId(userId);

        if (existing) {
            return existing;
        }

        const profile: ParentProfile = {

            id: crypto.randomUUID(),

            userId,

            displayName,

            childIds: [],

            settings: createDefaultSettings(),

            createdAt: new Date().toISOString()

        };

        await this.parents.save(profile);

        return profile;

    }

    async linkChild(
        parentId: string,
        childId: string
    ): Promise<ParentProfile> {

        const profile = await this.requireProfile(parentId);

        if (!profile.childIds.includes(childId)) {
            profile.childIds.push(childId);
        }

        await this.parents.save(profile);

        return profile;

    }

    async updateSettings(
        parentId: string,
        settings: Partial<ParentSettings>
    ): Promise<ParentProfile> {

        const profile = await this.requireProfile(parentId);

        profile.settings = {
            ...profile.settings,
            ...settings
        };

        await this.parents.save(profile);

        return profile;

    }

    async updateProfile(
        parentId: string,
        updates: { displayName?: string; settings?: Partial<ParentSettings> }
    ): Promise<ParentProfile> {

        const profile = await this.requireProfile(parentId);

        if (updates.displayName !== undefined) {
            profile.displayName = updates.displayName;
        }

        if (updates.settings) {

            profile.settings = {
                ...profile.settings,
                ...updates.settings
            };

        }

        await this.parents.save(profile);

        return profile;

    }

    async getProfile(
        parentId: string
    ): Promise<ParentProfile | undefined> {

        return this.parents.findById(parentId);

    }

    async getProfileByUserId(
        userId: string
    ): Promise<ParentProfile | undefined> {

        return this.parents.findByUserId(userId);

    }

    private async requireProfile(
        parentId: string
    ): Promise<ParentProfile> {

        const profile = await this.parents.findById(parentId);

        if (!profile) {

            throw new Error(
                `Parent profile '${parentId}' not found.`
            );

        }

        return profile;

    }

}
