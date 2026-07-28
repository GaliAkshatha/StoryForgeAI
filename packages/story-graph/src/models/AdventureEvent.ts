import { AdventureEventType } from "@storyforge/shared";
import { EmotionProfile } from "./EmotionProfile";

// Derived deterministically from a StoryNode's eventType at the
// moment the child arrives there -- no LLM involved in producing
// this record. This is the substrate both the chapter/adventure-end
// Reflection call and the Deterministic Analytics Engine read from,
// replacing the old "ask the LLM what just happened" per-turn call.
export interface AdventureEvent {

    id: string;

    worldId: string;

    sessionId: string;

    childId: string;

    adventureId: string;

    nodeId: string;

    eventType: AdventureEventType;

    // A snapshot of the node's narrative at the time, for later
    // chapter-end reflection/summary generation to reference.
    narrative: string;

    // Part 5 (Emotion Engine): the node's emotional signature at the
    // time, so a rolling trend (e.g. frustration climbing) can be
    // computed without re-fetching every StoryNode visited.
    emotion: EmotionProfile;

    createdAt: string;

}
