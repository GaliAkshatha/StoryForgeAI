export interface CharacterPlan {

    name: string;

    role: string;

    personality: string;

}

export interface StoryBeat {

    order: number;

    title: string;

    description: string;

}

export interface PlannerOutput {

    title: string;

    genre: string;

    targetAudience: string;

    tone: string;

    moral: string;

    theme: string;

    setting: string;

    estimatedReadingTime: string;

    characters: CharacterPlan[];

    storyBeats: StoryBeat[];

}