import { Router } from "express";
import { AppContainer } from "../container/AppContainer";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";

export function adventureRoutes(app: AppContainer): Router {

    const router = Router();

    router.use(requireAuth(app));

    router.post("/start", async (req: AuthenticatedRequest, res) => {

        const { childId, location, learningGoal } = req.body ?? {};

        if (!childId || !location || !learningGoal) {

            res.status(400).json({
                error: "childId, location, and learningGoal are required."
            });

            return;

        }

        const child = await app.children.getProfile(childId);

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Child not found." });

            return;

        }

        try {

            // The parent's free-form goal ("I want my daughter to
            // understand honesty") is converted into a concrete,
            // story-usable moral + domain here -- the child never
            // sees the parent's original text or this objective.
            const objective = await app.learningGoals.deriveObjective({

                parentGoalText: learningGoal,

                ageRange: child.ageRange,

                aboutChild: child.aboutChild

            });

            const result = await app.adventures.startAdventure({

                childId: child.id,

                childName: child.name,

                ageRange: child.ageRange,

                location,

                moral: objective.moral,

                domain: objective.domain,

                aboutChild: child.aboutChild

            });

            await app.children.recordAdventureStarted(child.id, result.worldId);

            // objective is included so the parent's own UI can show
            // "here's what this adventure will focus on" as a
            // confirmation -- it is not intended for the child's
            // adventure screen.
            res.status(201).json({ ...result, objective });

        }
        catch (error) {

            res.status(500).json({
                error: error instanceof Error ? error.message : "Could not start the adventure."
            });

        }

    });

    router.post("/turn", async (req: AuthenticatedRequest, res) => {

        const { worldId, sessionId, childId, selectedChoiceId } = req.body ?? {};

        if (!worldId || !sessionId || !childId || !selectedChoiceId) {

            res.status(400).json({
                error: "worldId, sessionId, childId, and selectedChoiceId are required."
            });

            return;

        }

        const child = await app.children.getProfile(childId);

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Child not found." });

            return;

        }

        try {

            const result = await app.adventures.playTurn({

                worldId,

                sessionId,

                childId: child.id,

                childName: child.name,

                ageRange: child.ageRange,

                selectedChoiceId,

                aboutChild: child.aboutChild

            });

            // v3: analytics is only populated on the turn that
            // concludes a chapter (Part 3/4) -- most turns have
            // nothing new to record here.
            if (result.analytics) {

                await app.learning.recordSession(result.analytics);

            }

            // The frontend is only expected to render narrative +
            // choices (+ optional emotionalTone); worldUpdate and
            // learningSignals are here for completeness/debugging --
            // the backend has already consumed them (persisted
            // WorldState, persisted StoryTurn, fed the Analytics
            // Agent) before this response is built.
            res.json(result);

        }
        catch (error) {

            res.status(400).json({
                error: error instanceof Error ? error.message : "The story couldn't continue. Try again."
            });

        }

    });

    router.get("/:worldId/state", async (req: AuthenticatedRequest, res) => {

        const worldState = await app.ai.worldStateStore.get(String(req.params.worldId));

        if (!worldState) {

            res.status(404).json({ error: "Adventure not found." });

            return;

        }

        const child = await app.children.getProfile(worldState.childId);

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Adventure not found." });

            return;

        }

        // Part 14: "Save at every node. Resume instantly." WorldState
        // already persists the exact node the child is on after
        // every turn -- resuming is just reading it back, no new AI
        // call needed.
        res.json({

            worldId: worldState.worldId,

            narrative: worldState.currentNarrative,

            choices: worldState.currentChoices,

            turn: worldState.turn

        });

    });

    router.get("/:worldId/history", async (req: AuthenticatedRequest, res) => {

        const worldState = await app.ai.worldStateStore.get(String(req.params.worldId));

        if (!worldState) {

            res.status(404).json({ error: "Adventure not found." });

            return;

        }

        const child = await app.children.getProfile(worldState.childId);

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Adventure not found." });

            return;

        }

        // Part 14: "Show branching timeline." The full turn-by-turn
        // transcript already persisted by AdventureRuntime -- this is
        // the replay/timeline view over it.
        const sessionId = req.query.sessionId as string | undefined;

        const turns = sessionId
            ? await app.ai.storyTurnRepository.findBySessionId(sessionId)
            : await app.ai.storyTurnRepository.findByWorldId(String(req.params.worldId));

        res.json({ turns });

    });

    return router;

}
