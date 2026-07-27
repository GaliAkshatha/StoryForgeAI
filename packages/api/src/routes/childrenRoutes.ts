import { Router } from "express";
import { AppContainer } from "../container/AppContainer";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";

export function childrenRoutes(app: AppContainer): Router {

    const router = Router();

    router.use(requireAuth(app));

    router.get("/", async (req: AuthenticatedRequest, res) => {

        const children = await app.children.listForParent(req.parentId!);

        res.json({ children });

    });

    router.post("/", async (req: AuthenticatedRequest, res) => {

        const {
            name,
            ageRange,
            readingLevel,
            vocabularyLevel,
            avatarId,
            aboutChild
        } = req.body ?? {};

        if (!name || !ageRange) {

            res.status(400).json({
                error: "name and ageRange are required."
            });

            return;

        }

        const child = await app.children.createProfile({

            parentId: req.parentId!,

            name,

            ageRange,

            readingLevel: readingLevel ?? "early-reader",

            vocabularyLevel: vocabularyLevel ?? "grade-appropriate",

            avatarId: avatarId ?? "fox",

            aboutChild: aboutChild || undefined

        });

        await app.parents.linkChild(req.parentId!, child.id);

        res.status(201).json({ child });

    });

    return router;

}
