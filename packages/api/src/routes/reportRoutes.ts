import { Router } from "express";
import { AppContainer } from "../container/AppContainer";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";

export function reportRoutes(app: AppContainer): Router {

    const router = Router();

    router.use(requireAuth(app));

    router.get("/:childId/weekly", async (req: AuthenticatedRequest, res) => {

        const child = await app.children.getProfile(String(req.params.childId));

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Child not found." });

            return;

        }

        const weekEnd = new Date();

        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        const report = await app.learning.generateWeeklyReport(
            child.id,
            weekStart,
            weekEnd
        );

        res.json({ report });

    });

    router.get("/:childId/growth", async (req: AuthenticatedRequest, res) => {

        const child = await app.children.getProfile(String(req.params.childId));

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Child not found." });

            return;

        }

        const skillGrowth = await app.learning.getSkillGrowth(child.id);

        res.json({ skillGrowth });

    });

    router.get("/:childId/trend", async (req: AuthenticatedRequest, res) => {

        const child = await app.children.getProfile(String(req.params.childId));

        if (!child || child.parentId !== req.parentId) {

            res.status(404).json({ error: "Child not found." });

            return;

        }

        try {

            const weeklyTrend = await app.learning.getWeeklyTrend(child.id, 8);

            const totalSessions = weeklyTrend.reduce(
                (sum, week) => sum + week.sessionsPlayed,
                0
            );

            // Not enough play history yet for a meaningful AI
            // narrative -- return the raw trend so the chart can
            // still render, without forcing the LLM to narrate noise.
            if (totalSessions === 0) {

                res.json({ weeklyTrend, summary: null });

                return;

            }

            const summary = await app.learningSummaries.summarize({

                childName: child.name,

                weeklyTrend

            });

            res.json({ weeklyTrend, summary });

        }
        catch (error) {

            console.error("\n===== Route failed =====\n", error, "\n=========================\n");

            res.status(500).json({
                error: "Could not generate trend summary."
            });
        }

    });

    return router;

}
