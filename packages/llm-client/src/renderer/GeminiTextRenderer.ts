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

        return (
            `You are a renderer, not a story engine. An event has already been decided -- your only job ` +
            `is to describe it in prose. Do not invent characters, items, rewards, or outcomes. Do not change ` +
            `what happened. Age-appropriate vocabulary for a ${request.ageRange} year old. Maximum ` +
            `${request.maxSentences} sentences. Write at least one full sentence -- a single fragment or ` +
            `isolated phrase is not acceptable, even if brief. Return narration only, no JSON, no preamble.\n\n` +
            `Location: ${request.location}\n` +
            `Actor: ${request.actorName}\n` +
            (request.targetName ? `With: ${request.targetName}\n` : "") +
            // Was `What happened: ${actorName} ${narrativeSeed}.` --
            // that hardcoded grammatical fusion only reads correctly
            // when narrativeSeed is an action-verb phrase meant to
            // follow the actor's name (e.g. "helps Fenn with
            // something"). It breaks for a scene-setting seed like
            // the root node's premise ("a small mouse named Squeak
            // looks worried near a fallen branch"), producing a
            // nonsensical fused sentence fragment -- which is what
            // caused a real 3-token, 11-character root narration.
            // Presenting the situation as its own labeled fact lets
            // the model construct a correct sentence for either
            // shape, the same way it already does with the separate
            // Actor/Location/With facts above.
            `Situation: ${request.narrativeSeed}\n` +
            `Tone: ${request.tone}\n`
        );

    }

}
