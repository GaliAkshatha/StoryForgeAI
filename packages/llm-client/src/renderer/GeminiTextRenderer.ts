import { TextRenderer, RenderRequest, RenderResult } from "./TextRenderer";
import { LLMClient } from "../interfaces/LLMClient";

const MAX_OUTPUT_TOKENS = 120;

// Phase K: "You are a renderer, not the story engine." This prompt
// is deliberately tiny compared to AdventureBlueprintGenerator's --
// one already-decided event, plain text output (not JSON -- Phase K:
// "avoid large JSON responses when only narration is required"),
// bounded output tokens, no WorldState, no history.
export class GeminiTextRenderer implements TextRenderer {

    constructor(
        private readonly llmClient: LLMClient
    ) {}

    async render(
        request: RenderRequest
    ): Promise<RenderResult> {

        const prompt = this.buildPrompt(request);

        const response = await this.llmClient.generate({

            prompt,

            responseFormat: "text",

            maxTokens: MAX_OUTPUT_TOKENS,

            metadata: { caller: "GeminiTextRenderer", purpose: "render_story_node" }

        });

        return { text: response.text.trim(), rendererUsed: "gemini" };

    }

    private buildPrompt(
        request: RenderRequest
    ): string {

        const isOpening = request.eventType === "adventure_opening";

        return (
            `You are a renderer, not a story engine. An event has already been decided -- your only job ` +
            `is to describe it in prose. Do not invent characters, items, rewards, or outcomes. Do not change ` +
            `what happened. Age-appropriate vocabulary for a ${request.ageRange} year old. Maximum ` +
            `${request.maxSentences} sentences. Write at least one full sentence -- a single fragment or ` +
            `isolated phrase is not acceptable, even if brief. Return narration only, no JSON, no preamble.\n\n` +
            (isOpening
                ? `Write the OPENING of a children's story. Start with ONE short sensory or atmospheric detail ` +
                  `(a sound, the light, the air, something small moving) to set a sense of place -- give the ` +
                  `reader a moment to arrive before anything happens. THEN naturally introduce ${request.actorName} ` +
                  `as the one experiencing this. ONLY THEN lead into the situation below. Do not jump straight ` +
                  `from arrival into the situation with no space in between -- "Ak steps into the wood. A ` +
                  `squirrel scatters berries..." is too abrupt, a status report, not a story opening.` +
                  (request.targetName
                    ? ` If another character appears in the situation, use their actual name (${request.targetName}) ` +
                      `the first time they're mentioned -- never describe them only generically (e.g. "a small ` +
                      `squirrel") when they have a name.`
                    : ``
                  ) +
                  `\n\n`
                : ""
            ) +
            `Location: ${request.location}\n` +
            `Actor: ${request.actorName}\n` +
            (request.targetName ? `With: ${request.targetName}\n` : "") +
            `Situation: ${request.narrativeSeed}\n` +
            `Tone: ${request.tone}\n`
        );

    }

}
