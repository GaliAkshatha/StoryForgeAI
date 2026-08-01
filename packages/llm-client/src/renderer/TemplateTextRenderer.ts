import { TextRenderer, RenderRequest, RenderResult } from "./TextRenderer";

// Phase L: a small deterministic renderer for obvious events --
// exists to eliminate LLM calls for events simple enough that a
// template is genuinely just as good, not to replace narration
// generally. Deliberately tiny: one line per event type.
export class TemplateTextRenderer implements TextRenderer {

    private readonly templates: Record<string, (req: RenderRequest) => string> = {

        explored: req => `${req.actorName} explores a new part of ${req.location}, curious about what's there.`,

        observed: req => `${req.actorName} pays close attention to the details around ${req.location}.`,

        asked_questions: req =>
            `${req.actorName} asks ${req.targetName ?? "someone nearby"} a few thoughtful questions.`,

        shared_resources: req =>
            `${req.actorName} shares something useful with ${req.targetName ?? "a new friend"}.`,

        ignored_warning: req => `${req.actorName} presses on despite a clear warning sign at ${req.location}.`,

        failed_puzzle: req => `${req.actorName} tries, but the puzzle doesn't budge -- not yet, anyway.`,

        retried: req => `${req.actorName} takes a breath and tries again.`

    };

    async render(
        request: RenderRequest
    ): Promise<RenderResult> {

        // Phase 2B (Section L): narrativeSeed is no longer a generic
        // label -- since Phase 2A, SemanticEventBuilder derives it
        // from the contextual `action` field (e.g. "shares the
        // lantern with Squeak" instead of just "shares something").
        // Prefer it over the fixed per-type templates below whenever
        // it's substantive enough to be worth using; the fixed
        // templates remain as the fallback for thin/missing seeds.
        const seed = request.narrativeSeed?.trim();

        if (seed && seed.length > 15) {

            return { text: `${request.actorName} ${seed}.`, rendererUsed: "template" };

        }

        const template = this.templates[request.eventType];

        const text = template
            ? template(request)
            : `${request.actorName} ${request.narrativeSeed}.`;

        return { text, rendererUsed: "template" };

    }

}
