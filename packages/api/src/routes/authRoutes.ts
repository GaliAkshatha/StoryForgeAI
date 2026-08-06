import { Router } from "express";
import { AppContainer } from "../container/AppContainer";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";

export function authRoutes(app: AppContainer): Router {

    const router = Router();

    router.post("/register", async (req, res) => {

        const { email, password, displayName } = req.body ?? {};

        if (!email || !password || !displayName) {

            res.status(400).json({
                error: "email, password, and displayName are required."
            });

            return;

        }

        try {

            const user = await app.auth.register(email, password);

            const parent = await app.parents.createProfile(
                user.id,
                displayName
            );

            const session = await app.auth.login(email, password);

            res.status(201).json({ token: session.token, parent });

        }
        catch (error) {

            console.error("\n===== Route failed =====\n", error, "\n=========================\n");

            res.status(400).json({
                error: "Registration failed."
            });
        }

    });

    router.post("/login", async (req, res) => {

        const { email, password } = req.body ?? {};

        if (!email || !password) {

            res.status(400).json({ error: "email and password are required." });

            return;

        }

        try {

            const session = await app.auth.login(email, password);

            const parent = await app.parents.getProfileByUserId(session.userId);

            res.json({ token: session.token, parent });

        }
        catch (error) {

            console.error("\n===== Route failed =====\n", error, "\n=========================\n");

            res.status(401).json({
                error: "Login failed."
            });
        }

    });

    // Restores a session after a page reload: the frontend keeps the
    // JWT in sessionStorage but never persisted the parent profile,
    // so it re-fetches it here on load using the token alone.
    router.get("/me", requireAuth(app), async (req: AuthenticatedRequest, res) => {

        const parent = await app.parents.getProfile(req.parentId!);

        if (!parent) {

            res.status(404).json({ error: "Parent profile not found." });

            return;

        }

        res.json({ parent });

    });

    router.post("/change-password", requireAuth(app), async (req: AuthenticatedRequest, res) => {

        const { currentPassword, newPassword } = req.body ?? {};

        if (!currentPassword || !newPassword) {

            res.status(400).json({
                error: "currentPassword and newPassword are required."
            });

            return;

        }

        try {

            await app.auth.changePassword(
                req.userId!,
                currentPassword,
                newPassword
            );

            res.json({ success: true });

        }
        catch (error) {

            console.error("\n===== Route failed =====\n", error, "\n=========================\n");

            res.status(400).json({
                error: "Could not change password."
            });
        }

    });

    return router;

}
