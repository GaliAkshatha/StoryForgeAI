import { PlotBeat } from "@storyforge/simulation-engine";
import { AdventureEventType } from "@storyforge/shared";

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

    // Authored causal story spine -- 5 beats (hook/complication/
    // moral_fork/test/resolution). Each beat can carry an objective,
    // conflict, stakes, required reveal, and (for moral_fork) two
    // concrete choices plus their consequences. The runtime uses this
    // as story direction; it is not a prose transcript.
    plotOutline: PlotBeat[];

    // Choice-variety pass: per-adventure choice phrase templates
    // (one per event type), generated once alongside everything else
    // above so choice buttons match THIS adventure's tone instead of
    // reusing one fixed hardcoded set across every adventure ever
    // played. Optional and PARTIAL on purpose -- each field is
    // validated independently by AdventureMetadataGenerator, and any
    // field that fails validation is simply dropped rather than
    // failing the whole adventure; ChoiceTextBuilder falls back to
    // its own hardcoded default for any type missing here.
    choiceTemplates?: Partial<Record<AdventureEventType, string>>;

    rootNodeId: string;

    createdAt: string;

}
