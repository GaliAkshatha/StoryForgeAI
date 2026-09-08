export interface RenderRequest {

    ageRange: string;

    // Real adventure-level fields now (see AdventureCompiler ->
    // InitialStoryBuilder -> NarrativeState), not a hardcoded
    // constant. Previously every single adventure sent the literal
    // string "fantasy_adventure" here regardless of its actual theme
    // (pirates, space, a quiet forest walk) or the humor/mystery
    // balance Gemini itself chose when designing the adventure --
    // meaning the narrator was structurally told to write the same
    // tone every time, no matter what story it was actually telling.
    tone: string;

    // 0-1, from Adventure.genome -- how much comic lightness vs.
    // gravity the prose should carry. Optional: template-rendered
    // trivial turns don't need it, and older/legacy adventures may
    // not have a genome at all.
    humor?: number;

    // 0-1, from Adventure.genome -- how much the prose should lean
    // into suspense/the unknown vs. being straightforwardly clear.
    mystery?: number;

    // From Adventure.genome.vocabulary (e.g. "simple", "rich") --
    // finer-grained than ageRange alone; two adventures for the same
    // age can call for different vocabulary richness depending on
    // the story Gemini designed.
    vocabulary?: string;

    // Style-continuity pass: the opening few words of the last few
    // rendered turns, so this turn's prose can be told not to start
    // the same way again. Optional -- absent on the very first turn
    // (nothing rendered yet) and for template-rendered trivial turns
    // that don't need it.
    avoidOpenings?: string[];

    maxSentences: number;

    location: string;

    actorName: string;

    targetName?: string;

    eventType: string;

    narrativeSeed: string;

    skill?: string;

    personalizationHint?: string;

    // What actually happened as a result of this turn's event --
    // legitimate context for narrating the outcome (the event has
    // already occurred by the time this renders). NOT the learning
    // objective/moral -- that must never reach the narrator (a
    // previous `learningIntent` field did exactly that and risked
    // the private objective leaking into child-facing prose).
    consequenceContext?: string;

    // Phase M's routing signal -- set by whoever builds the request
    // (the engine already decided this when building the candidate
    // event; the router doesn't re-derive it).
    complexity: "trivial" | "rich";

}

export interface RenderResult {

    text: string;

    // Which renderer actually produced this -- Phase M: "make
    // routing observable."
    rendererUsed: string;

}

// Phase J: "You are a renderer, not the story engine." Every
// implementation receives only already-decided structure and turns
// it into prose -- none of them are allowed to invent facts, change
// outcomes, or reason about what should happen.
export interface TextRenderer {

    render(
        request: RenderRequest
    ): Promise<RenderResult>;

}
