import { TextRenderer, RenderRequest, RenderResult } from "./TextRenderer";

// Novel-immersion fallback renderer: second-person "you" voice,
// 3–4 atmospheric sentences per template. Used when Gemini is
// unavailable (503/429) or for trivially simple events that don't
// need LLM prose.
export class TemplateTextRenderer implements TextRenderer {

    private readonly templates: Record<string, (req: RenderRequest) => string> = {

        explored: req =>
            `You step carefully into an uncharted corner of ${req.location}. The air shifts — ` +
            `cooler here, tinged with something earthy and old. A gentle rustle draws your ` +
            `attention to unexpected clues half-hidden just ahead, waiting to be found.`,

        observed: req =>
            `You pause and let the scene settle around you, watching with sharp attention. ` +
            `Every small detail in ${req.location} seems to whisper a piece of the larger ` +
            `story — the pattern in the bark, the way light falls across the ground. ` +
            `Something here matters, if you look closely enough.`,

        asked_questions: req =>
            `You lean in and ask ${req.targetName ?? "your companion"} what really happened. ` +
            `${req.targetName ? `${req.targetName} pauses, weighing whether to trust you with the truth, then begins to speak.` : "An attentive conversation unfolds, revealing something no one else had noticed."}`,

        shared_resources: req =>
            `You offer something useful to ${req.targetName ?? "your companion"} without a ` +
            `second thought. The look on their face shifts — surprise first, then something ` +
            `warmer and deeper. Trust, maybe. Or the quiet relief of knowing they're not alone.`,

        ignored_warning: req =>
            `You press on past the cautionary signs at ${req.location}, pulse quickening. ` +
            `The path ahead grows steeper, the shadows longer. Whatever lies ahead, you've ` +
            `chosen to face it rather than turn back. The stakes just got higher.`,

        failed_puzzle: req =>
            `You test your solution, certain this time it will work — but the pieces don't ` +
            `align, not quite. Frustration flickers through you, then something else: ` +
            `curiosity. The failure itself has shown you something about how the puzzle works.`,

        retried: req =>
            `You take a steady breath, close your eyes for a moment, and let the earlier ` +
            `mistake replay in your mind. This time you see what you missed before. With ` +
            `fresh eyes and a clearer plan, you give it another determined try.`

    };

    async render(
        request: RenderRequest
    ): Promise<RenderResult> {

        // Phase 2B (Section L): narrativeSeed is no longer a generic
        // label -- since Phase 2A, SemanticEventBuilder derives it
        // from the contextual `action` field (e.g. "reach out to help
        // Pip" instead of just "helps someone"). Prefer it over the
        // fixed per-type templates below whenever it's substantive
        // enough to be worth using; the fixed templates remain as the
        // fallback for thin/missing seeds.
        const seed = request.narrativeSeed?.trim();

        if (request.eventType === "adventure_opening" && seed) {

            const situation = seed.endsWith(".") ? seed : `${seed}.`;

            // If the premise text doesn't already mention the other
            // character's name (simple substring check, not NLP),
            // add one short clause introducing them.
            const targetIntro =
                request.targetName && !situation.includes(request.targetName)
                    ? ` ${request.targetName} is already here, watching you with cautious curiosity.`
                    : "";

            const openers = [
                `You arrive at ${request.location}, the air humming with quiet energy.`,
                `The story begins the moment you step into ${request.location}, heart beating a little faster.`,
                `Your adventure starts here, at ${request.location}, where everything feels just slightly different.`
            ];

            const atmosphereBeats = [
                "A cool breeze brushes your skin, carrying the scent of damp earth and wild sage.",
                "Somewhere nearby, birds are singing a melody you've never heard before.",
                "The air feels calm and a little magical, as if the place itself is watching.",
                "Everything is still, just for a moment — like the world is holding its breath."
            ];

            const atmosphere = atmosphereBeats[request.location.length % atmosphereBeats.length];

            const opener = openers[seed.length % openers.length];

            return { text: `${opener} ${atmosphere} ${situation}${targetIntro}`, rendererUsed: "template" };

        }

        const consequenceNote = request.consequenceContext ? ` ${request.consequenceContext}.` : "";

        if (seed && seed.length > 15) {

            return { text: `You ${seed}.${consequenceNote}`, rendererUsed: "template" };

        }

        const template = this.templates[request.eventType];

        const baseText = template
            ? template(request)
            : `You ${request.narrativeSeed}.`;

        const text = consequenceNote && !baseText.includes(request.consequenceContext ?? "")
            ? `${baseText}${consequenceNote}`
            : baseText;

        return { text, rendererUsed: "template" };

    }

}

