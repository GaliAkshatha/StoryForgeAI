import { Choice, WorldUpdate } from "@storyforge/simulation-engine";
import { Reflection, LearningAnalytics } from "@storyforge/shared";

export interface StartAdventureInput {

    childId: string;

    childName: string;

    ageRange: string;

    location: string;

    // The parent's learning goal for this adventure, already
    // resolved to a concrete moral (see Phase 5b: parent-driven
    // learning goals). Never shown to the child.
    moral: string;

    // Learning domain for knowledge retrieval, e.g. "leadership",
    // "history", "cybersecurity", "ethics".
    domain: string;

    // Free-form parent personalization notes, threaded straight
    // through to the Consequence Engine's prompts. Optional.
    aboutChild?: string;

}

export interface StartAdventureOutput {

    worldId: string;

    sessionId: string;

    // The opening scene. The child sees ONLY these two fields --
    // never the moral, never worldUpdate/learningSignals.
    narrative: string;

    choices: Choice[];

    isEnding: boolean;

    emotionalTone: string;

}

export interface AdventureTurnInput {

    worldId: string;

    sessionId: string;

    childId: string;

    childName: string;

    ageRange: string;

    // The id of one of the choices offered in the previous
    // narrative/choices response. Resolved server-side against the
    // WorldState's currentChoices -- the client sends nothing but
    // this id, per the Master Prompt: "Only the selected choice ID
    // is sent back."
    selectedChoiceId: string;

    aboutChild?: string;

}

export interface AdventureTurnOutput {

    // What the child sees.
    narrative: string;

    choices: Choice[];

    // v3: the Story Graph can genuinely end. When true, choices is
    // empty and this is a terminal node -- the frontend should show
    // an ending screen, not an empty choice grid.
    isEnding: boolean;

    // Not in the Master Prompt's minimal AI Output Format, but kept
    // as a small enrichment the frontend can optionally use (e.g. to
    // theme the scene's animation/color) -- purely additive.
    emotionalTone: string;

    // What the backend consumes. Never rendered by the frontend.
    worldUpdate: WorldUpdate;

    learningSignals: string[];

    // Additional agent output beyond the Master Prompt's minimal AI
    // Output Format -- kept because the Reflection and Analytics
    // Agents are mandatory collaborators (Master Prompt point 12:
    // "Do NOT remove... instead improve their collaboration"), not
    // because the frontend is required to render them. v3: only
    // populated on the turn that concludes a chapter (isEnding ===
    // true) -- most turns leave these undefined, since Reflection
    // and Analytics no longer run every turn (Part 3/4).
    reflection?: Reflection;

    analytics?: LearningAnalytics;

}
