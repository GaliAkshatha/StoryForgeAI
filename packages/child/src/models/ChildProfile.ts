export interface ChildProfile {

    id: string;

    parentId: string;

    name: string;

    ageRange: string;

    readingLevel: string;

    vocabularyLevel: string;

    avatarId: string;

    // Free-form parent notes ("Loves dragons", "Very shy", "Gets
    // frustrated easily") used to personalize story theme,
    // vocabulary, characters, emotional tone, and quest difficulty.
    // Optional, and never shown to the child.
    aboutChild?: string;

    // Adventure worldIds this child has played, most recent last.
    // Full turn-by-turn history lives in simulation-engine's
    // WorldStateStore / analytics-agent's session history -- this is
    // just the index a Child profile needs to list them.
    adventureWorldIds: string[];

    createdAt: string;

}

export interface CreateChildProfileInput {

    parentId: string;

    name: string;

    ageRange: string;

    readingLevel: string;

    vocabularyLevel: string;

    avatarId: string;

    aboutChild?: string;

}
