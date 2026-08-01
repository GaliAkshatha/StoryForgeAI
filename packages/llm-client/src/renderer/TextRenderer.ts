export interface RenderRequest {

    ageRange: string;

    tone: string;

    maxSentences: number;

    location: string;

    actorName: string;

    targetName?: string;

    eventType: string;

    narrativeSeed: string;

    skill?: string;

    personalizationHint?: string;

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
