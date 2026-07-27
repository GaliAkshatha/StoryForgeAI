// A durable record of one turn of an adventure. Previously this
// history lived only in AdventureRuntime's in-memory Map, which
// meant a server restart silently lost the Analytics Agent's
// context mid-session. It's modeled here, next to WorldState,
// because both represent an adventure's persisted history.
export interface StoryTurn {

    id: string;

    worldId: string;

    sessionId: string;

    childId: string;

    situationText: string;

    decisionText: string;

    consequenceNarrative: string;

    reflectionQuestion: string;

    // The learningSignal tags the Consequence Engine attached to
    // this specific turn (see Consequence.learningSignals) --
    // persisted so the Parent Dashboard can eventually trace a
    // skill-growth trend back to the moments that produced it.
    learningSignals: string[];

    createdAt: string;

}
