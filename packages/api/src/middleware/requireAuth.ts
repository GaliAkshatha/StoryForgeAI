import { Request, Response, NextFunction } from "express";
import { AppContainer } from "../container/AppContainer";

export interface AuthenticatedRequest extends Request {

    userId?: string;

    parentId?: string;

}

export function requireAuth(app: AppContainer) {

    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {

        const header = req.headers.authorization;

        const token = header?.startsWith("Bearer ")
            ? header.slice("Bearer ".length)
            : undefined;

        if (!token) {

            res.status(401).json({ error: "Missing bearer token." });

            return;

        }

        const userId = await app.auth.verify(token);

        if (!userId) {

            res.status(401).json({ error: "Invalid or expired session." });

            return;

        }

        const profile = await app.parents.getProfileByUserId(userId);

        if (!profile) {

            res.status(404).json({ error: "Parent profile not found." });

            return;

        }

        req.userId = userId;

        req.parentId = profile.id;

        next();

    };

}
