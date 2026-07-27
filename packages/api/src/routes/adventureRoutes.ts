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

            await app.learning.recordSession(result.analytics);

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

    return router;

}
