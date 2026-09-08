import { Router } from "express";
import { AppContainer } from "../container/AppContainer";

// Guest demo: the whole point is "full real access to the story and
// choices, no account needed" -- so this deliberately does NOT use
// requireAuth. What an account actually gates is history/analytics
// (app.learning.recordSession is never called here), which happens
// naturally as a side effect of app.demoAdventures being a fully
// separate, always-in-memory runtime (see AppContainer) -- there is
// no repository this data could land in even if we wanted it to.

// Simple in-memory sliding-window rate limit, keyed by IP. This
// exists because /demo/start makes a real, costly Gemini call and
// has NO auth in front of it -- without a limit, it's an open tap on
// whichever API key the server is configured with. Intentionally
// crude (no Redis, no distributed state) -- this is a single-process
// deployment; a proper distributed limiter is a real upgrade if this
// ever needs to scale across multiple instances.
const DEMO_STARTS_PER_WINDOW = 5;

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const demoStartLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {

    const now = Date.now();

    const recent = (demoStartLog.get(ip) ?? []).filter(ts => now - ts < WINDOW_MS);

    demoStartLog.set(ip, recent);

    return recent.length >= DEMO_STARTS_PER_WINDOW;

}

function recordDemoStart(ip: string): void {

    const recent = demoStartLog.get(ip) ?? [];

    recent.push(Date.now());

    demoStartLog.set(ip, recent);

}

const PRESET_SKILLS: Record<string, { moral: string; domain: string }> = {

    honesty: { moral: "telling the truth even when it's hard", domain: "honesty" },

    empathy: { moral: "noticing and caring how someone else feels", domain: "empathy" },

    courage: { moral: "doing the right thing even when you're scared", domain: "courage" },

    sharing: { moral: "sharing and including others", domain: "sharing" }

};

export function demoRoutes(app: AppContainer): Router {

    const router = Router();

    router.post("/start", async (req, res) => {

        const ip = req.ip ?? "unknown";

        if (isRateLimited(ip)) {

            res.status(429).json({
                error: "Too many demo adventures started recently. Please try again in a little while, or create a free account to keep playing."
            });

            return;

        }

        const { skill, location, childName } = req.body ?? {};

        const preset = PRESET_SKILLS[skill];

        if (!preset || !location) {

            res.status(400).json({
                error: `skill (one of ${Object.keys(PRESET_SKILLS).join(", ")}) and location are required.`
            });

            return;

        }

        // A real name matters -- "Explorer" as a hardcoded stand-in
        // was a genuine bug (a user reported not knowing who they
        // were in the story), not an acceptable demo shortcut. Falls
        // back to something friendlier than a placeholder only if
        // the guest skipped the field.
        const safeChildName = typeof childName === "string" && childName.trim().length > 0
            ? childName.trim().slice(0, 40)
            : "Traveler";

        try {

            recordDemoStart(ip);

            // A synthetic, throwaway identity -- never written to any
            // repository (this runtime is always in-memory) and never
            // associated with a real Parent/Child record.
            const guestChildId = `guest-${crypto.randomUUID()}`;

            const result = await app.demoAdventures.startAdventure({

                childId: guestChildId,

                childName: safeChildName,

                ageRange: "7-9",

                location,

                moral: preset.moral,

                domain: preset.domain

            });

            res.json(result);

        }
        catch (error) {

            console.error("Demo adventure failed to start:", error);

            res.status(500).json({ error: "Could not start the demo adventure. Please try again." });

        }

    });

    router.post("/turn", async (req, res) => {

        const { worldId, sessionId, selectedChoiceId, childName } = req.body ?? {};

        if (!worldId || !sessionId || !selectedChoiceId) {

            res.status(400).json({
                error: "worldId, sessionId, and selectedChoiceId are required."
            });

            return;

        }

        const safeChildName = typeof childName === "string" && childName.trim().length > 0
            ? childName.trim().slice(0, 40)
            : "Traveler";

        try {

            const result = await app.demoAdventures.playTurn({

                worldId,

                sessionId,

                childId: `guest-${worldId}`,

                childName: safeChildName,

                ageRange: "7-9",

                selectedChoiceId

            });

            // Deliberately no app.learning.recordSession(...) call --
            // this is the actual gate: an account is what makes a
            // playthrough's analytics land somewhere retrievable.
            // Nothing here withholds the reflection/ending experience
            // itself from the guest, only its persistence afterward.
            res.json(result);

        }
        catch (error) {

            console.error("Demo turn failed:", error);

            res.status(500).json({ error: "Something went wrong continuing the story. Please try again." });

        }

    });

    return router;

}
