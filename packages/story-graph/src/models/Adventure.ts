export interface AdventureCharacter {

    id: string;

    name: string;

    role: string;

    description: string;

}

export interface AdventureWorld {

    setting: string;

    description: string;

}

// Part 8: a compact fingerprint of what kind of adventure this is,
// generated once alongside the blueprint. Used for caching (two
// requests with a similar genome can reuse retrieval/grounding),
// recommendations ("more like this"), and future personalization --
// not read during traversal itself.
export interface StoryGenome {

    theme: string;

    explorationLevel: number;

    humor: number;

    mystery: number;

    fantasyDensity: number;

    puzzleDensity: number;

    npcComplexity: number;

    vocabulary: string;

}

export interface LearningPlanEntry {

    skillFocus: string;

    approach: string;

}

// An authored checkpoint in the adventure's intended emotional arc --
// distinct from any single StoryNode's EmotionProfile, this is the
// overall shape the generator was aiming for (used for later
// analytics/regeneration reference, not read during traversal).
export interface EmotionCurvePoint {

    label: string;

    excitement: number;

    tension: number;

}

// The Adventure Blueprint: everything Part 1 says should come out of
// the single expensive up-front generation, minus the StoryNodes
// themselves (which are persisted and queried separately -- see
// StoryNode -- so background expansion can append to the graph
// without rewriting this row).
export interface Adventure {

    id: string;

    childId: string;

    title: string;

    // The learning goal this adventure was generated for (already
    // resolved from the parent's free-form text upstream, same as
    // v2's LearningGoalService output).
    moral: string;

    domain: string;

    characters: AdventureCharacter[];

    world: AdventureWorld;

    learningPlan: LearningPlanEntry[];

    emotionCurve: EmotionCurvePoint[];

    genome: StoryGenome;

    rootNodeId: string;

    createdAt: string;

}
