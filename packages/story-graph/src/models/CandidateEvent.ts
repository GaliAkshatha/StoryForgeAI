import { AdventureEventType } from "@storyforge/shared";
import { StateEffect } from "@storyforge/simulation-engine";
import { EmotionProfile } from "./EmotionProfile";

export type EventPrerequisiteType =
    | "flag_true"
    | "flag_false"
    | "has_item"
    | "npc_present"
    | "relationship_trust_at_least"
    | "not_recently_used"
    | "problem_established";

export interface EventPrerequisite {

    type: EventPrerequisiteType;

    // Meaning depends on `type`: flag key, item id, character id, etc.
    key: string;

    // Only meaningful for relationship_trust_at_least.
    threshold?: number;

    // Only meaningful for not_recently_used -- how many recent turns
    // count as "recent" for cooldown purposes.
    cooldownTurns?: number;

}

export interface RelationshipEffect {

    characterId: string;

    characterName: string;

    trustDelta?: number;

    affinityDelta?: number;

}

// A candidate event is STRUCTURE, never prose. The Candidate Event
// Generator (Phase B) produces these deterministically from
// templates; nothing about narration lives here -- that's the
// SemanticEvent/TextRenderer's job (Phases I/J), strictly downstream
// of selection.
export interface CandidateEvent {

    id: string;

    type: AdventureEventType;

    actorId?: string;

    targetId?: string;

    targetName?: string;

    locationId?: string;

    prerequisites: EventPrerequisite[];

    effects: StateEffect[];

    learningTags: string[];

    emotionalEffects: Partial<EmotionProfile>;

    relationshipEffects: RelationshipEffect[];

    // A short, non-prose phrase describing the event's shape for the
    // renderer to expand into actual narration -- e.g. "helps an NPC
    // repair something broken." Deliberately NOT full sentences; the
    // TextRenderer is what turns this into age-appropriate prose.
    narrativeSeed: string;

    // Whether this event is simple enough for TemplateTextRenderer,
    // or needs Gemini's richer language (Phase M's routing signal).
    complexity: "trivial" | "rich";

    isEnding: boolean;

    endingType?: string;

}
