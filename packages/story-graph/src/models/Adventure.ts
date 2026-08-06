import { PlotBeat } from "@storyforge/simulation-engine";

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

    // Never read during traversal (only round-tripped for
    // persistence) -- kept for potential future analytics use, but
    // no longer requested from the metadata generator by default
    // (see AdventureMetadataGenerator) since it added schema
    // complexity for zero current runtime benefit. Optional so older
    // and newer callers both remain valid.
    emotionCurve?: EmotionCurvePoint[];

    genome: StoryGenome;

    // A short, non-prose phrase (NOT full narration) describing the
    // adventure's opening situation/premise -- e.g. "a small bird
    // named Pip sits sad and quiet at the edge of the wood." Used as
    // the narrativeSeed for the root node's own RenderRequest
    // (InitialStoryBuilder), the same way a CandidateEvent's
    // narrativeSeed drives every other node's rendering. This is the
    // one piece of genuinely creative content the metadata call is
    // allowed to produce beyond adventure-level facts.
    premise: string;

    // Stabilization pass: a short, distinct SITUATION phrase --
    // never a restatement of a character's name+description. Used
    // for choice-text/problem-continuity purposes (ChoiceTextBuilder,
    // ConstraintEngine's problem_established); `premise` remains the
    // richer opening-scene seed used for root narration.
    initialProblem: string;

    // Story arc pass: the authored plot -- 5 controlled-phrase beats
    // (hook/complication/moral_fork/test/resolution). This is what
    // gives the chapter an actual arc with a twist instead of
    // disconnected events; the deterministic engine advances through
    // these as ChapterProgressionEngine's phase advances.
    plotOutline: PlotBeat[];

    rootNodeId: string;

    createdAt: string;

}
