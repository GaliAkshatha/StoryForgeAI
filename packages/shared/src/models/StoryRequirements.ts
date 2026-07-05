import { AudienceProfile } from "./AudienceProfile";

export interface StoryRequirements {

    title?: string;

    genre: string;

    audience: AudienceProfile;

    moral: string;

    tone: string;

    theme: string;

    storyLength: string;

}