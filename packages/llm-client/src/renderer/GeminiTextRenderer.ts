import { TextRenderer, RenderRequest, RenderResult } from "./TextRenderer";
import { LLMClient } from "../interfaces/LLMClient";

const MAX_OUTPUT_TOKENS = 1024;

// Novel-immersion upgrade: second-person ("you/your") literary prose.
// The reader IS the protagonist — never referred to by name in
// narration. Sentence count follows request.maxSentences (varies by
// plot beat -- see SemanticEventBuilder), not a fixed count, so
// pacing still differs between a quiet exploratory turn and the
// moral_fork/test beats where the story needs more room.
//
// Token budget rationale: Gemini 2.5 Flash includes internal
// "thinking" tokens in maxOutputTokens. At 220, thinking consumed
// ~200 tokens leaving only ~9 for actual prose → truncation →
// quality gate rejection → template fallback. 1024 gives ample
// headroom for thinking (~200-400) plus a full paragraph (~150-200).
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
            `You are a master children's chapter-book author. Write in SECOND PERSON — the reader IS ` +
            `the protagonist. Use "you" and "your," NEVER use the protagonist's name in the prose. ` +
            `Write up to ${request.maxSentences} vivid, flowing sentences suited for age ${request.ageRange}. ` +
            `Open with a sensory scene beat, build through the action with authentic emotion and ` +
            `character interaction, close with a consequence or emotional hook that pulls the reader ` +
            `forward. Vary sentence rhythm. Include one piece of natural dialogue where it fits. ` +
            `Write like a great children's author -- alive, specific, never mechanical. ` +
            `Narration only — no JSON, no preamble, no choice options.\n\n` +
            (isOpening
                ? `OPENING SCENE: Immerse the reader in the setting first — sounds, smells, textures. ` +
                  `Then reveal the immediate situation with emotional stakes and warmth.` +
                  (request.targetName
                    ? ` Introduce ${request.targetName} with distinct personality through action or dialogue.`
                    : ``
                  ) +
                  `\n\n`
                : ""
            ) +
            `Setting: ${request.location}\n` +
            `Protagonist identity: ${request.actorName} (context only — do NOT use this name in prose, use "you")\n` +
            (request.targetName ? `Companion: ${request.targetName}\n` : "") +
            `Action: ${request.narrativeSeed}\n` +
            (request.consequenceContext ? `Impact & Outcome: ${request.consequenceContext}\n` : "") +
            `Tone: ${request.tone}\n` +
            (request.vocabulary ? `Vocabulary level: ${request.vocabulary}\n` : "") +
            this.craftGuidance(request)
        );

    }

    // Turns the adventure's own genome (generated once at adventure
    // creation, previously discarded immediately after) into actual
    // writing guidance instead of being thrown away -- this is what
    // lets two adventures with different humor/mystery balances
    // genuinely read differently, rather than every adventure
    // getting identical instructions regardless of the story Gemini
    // itself designed. Deliberately terse (one short line per signal,
    // only when the level is actually pronounced) to keep this
    // cheap -- not a rewrite of the whole prompt.
    private craftGuidance(
        request: RenderRequest
    ): string {

        const notes: string[] = [];

        if (request.humor !== undefined && request.humor > 0.6) {
            notes.push("let a little genuine humor come through");
        }

        if (request.mystery !== undefined && request.mystery > 0.6) {
            notes.push("lean into a sense of mystery -- don't over-explain");
        }

        if (request.avoidOpenings && request.avoidOpenings.length > 0) {
            const quoted = request.avoidOpenings.map(o => `"${o}..."`).join(", ");
            notes.push(`don't start this the same way as recent turns (avoid opening like ${quoted})`);
        }

        return notes.length > 0 ? `Also: ${notes.join("; ")}.\n` : "";

    }

}

