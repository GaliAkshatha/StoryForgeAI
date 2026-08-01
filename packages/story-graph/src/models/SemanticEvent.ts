// Phase I: the compact contract between the deterministic engine and
// language generation. Everything here has already been DECIDED --
// the renderer's only job is turning this into prose. Deliberately
// small: no WorldState, no history, no raw effects list -- only what
// language generation actually needs to know.
export interface SemanticEvent {

    task: "NARRATE";

    audience: {

        ageRange: string;

    };

    style: {

        tone: string;

        maxSentences: number;

    };

    scene: {

        location: string;

    };

    actor: {

        name: string;

    };

    target?: {

        name: string;

    };

    event: {

        type: string;

        narrativeSeed: string;

    };

    // Phase 2A additions -- these are what make this a CONTEXTUAL
    // story event rather than an event-type label. A SemanticEvent
    // must be able to answer: who acted, what did they actually do,
    // what existing context made it meaningful, and what changed.
    // eventType (above) remains the internal learning/analytics
    // classification; these fields are the actual story content.

    // What actually happens, in context -- e.g. "asks Squeak about
    // the fallen branch" rather than the bare eventType "asked_questions".
    action: string;

    // What changes in the story because of this action.
    consequence: string;

    // Set when this event establishes a new durable fact
    // (NarrativeState.establishedFacts).
    // Set when this event establishes what the current concrete
    // obstacle/problem is (NarrativeState.currentProblem was unset).
    problemEstablished?: string;

    // Set when this event resolves the current problem.
    problemResolved?: boolean;

    factEstablished?: string;

    // Set when this event opens a new unresolved narrative thread.
    threadIntroduced?: string;

    // Set when this event closes an existing unresolved thread.
    threadResolved?: string;

    // Set when this event brings a character into the active scene
    // for the first time (NarrativeState.activeCharacterIds).
    characterIntroduced?: {

        id: string;

        name: string;

    };

    learning?: {

        skill: string;

    };

    // Personalization hint only -- never the raw parent text, never
    // forwarded to the renderer as an instruction to reference
    // directly (same "never refer back to it" rule the v3 prompts
    // already establish).
    personalizationHint?: string;

}
