import { Router } from "express";
import { AppContainer } from "../container/AppContainer";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";

export function parentRoutes(app: AppContainer): Router {

    const router = Router();

    router.use(requireAuth(app));

    router.get("/me", async (req: AuthenticatedRequest, res) => {

        const parent = await app.parents.getProfile(req.parentId!);

        res.json({ parent });

    });

    router.patch("/me", async (req: AuthenticatedRequest, res) => {

        const { displayName, settings } = req.body ?? {};

        if (displayName === undefined && settings === undefined) {

            res.status(400).json({
                error: "Provide at least one of displayName or settings to update."
            });

            return;

        }

        try {

            const parent = await app.parents.updateProfile(req.parentId!, {

                displayName,

                settings

            });

            res.json({ parent });

        }
        catch (error) {

            console.error("\n===== Route failed =====\n", error, "\n=========================\n");

            res.status(400).json({
                error: "Could not update profile."
            });
        }

    });

    return router;

}
