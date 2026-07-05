import { AudienceProfile } from "./AudienceProfile";
import { Character } from "./Character";
import { StoryBeat } from "./StoryBeat";

export interface StoryPlan {

    title: string;

    genre: string;

    targetAudience: AudienceProfile;

    tone: string;

    moral: string;

    theme: string;

    setting: string;

    estimatedReadingTime: string;

    characters: Character[];

    storyBeats: StoryBeat[];

}