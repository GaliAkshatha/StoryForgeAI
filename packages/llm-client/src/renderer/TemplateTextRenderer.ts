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

        if (request.eventType === "adventure_opening" && seed) {

            const situation = seed.endsWith(".") ? seed : `${seed}.`;

            // If the premise text doesn't already mention the other
            // character's name (simple substring check, not NLP),
            // add one short clause introducing them -- otherwise the
            // narration can end up saying "a small squirrel" while
            // the choices below correctly say "Pip", since choices
            // are built deterministically from the character's real
            // name and narration here otherwise has no guarantee of
            // using it.
            const targetIntro =
                request.targetName && !situation.includes(request.targetName)
                    ? ` ${request.targetName} is there too.`
                    : "";

            const openers = [
                `${request.actorName} arrives at ${request.location}.`,
                `Our story begins as ${request.actorName} steps into ${request.location}.`,
                `${request.actorName}'s adventure starts here, at ${request.location}.`
            ];

            // Real browser bug: the opener jumped straight from
            // arrival into the raw problem with zero breathing room
            // ("Ak steps into the Whispering Wood. A squirrel
            // scatters berries..."), reading as abrupt and
            // mechanical. The actual reference tone for this project
            // ("A cool breeze rustles through the tall trees. Tiny
            // glowing butterflies dance around your feet. Far ahead,
            // a little squirrel...") gives one short sensory beat
            // BEFORE the situation lands. Generic and location-
            // agnostic on purpose -- this is a template fallback, not
            // scene-specific prose; Gemini's own prompt (already
            // instructed to set the scene) handles the richer case.
            const atmosphereBeats = [
                "A quiet breeze drifts by.",
                "Somewhere nearby, birds are singing.",
                "The air feels calm and a little magical.",
                "Everything is still, just for a moment."
            ];

            const atmosphere = atmosphereBeats[request.location.length % atmosphereBeats.length];

            const opener = openers[seed.length % openers.length];

            return { text: `${opener} ${atmosphere} ${situation}${targetIntro}`, rendererUsed: "template" };

        }

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
