import { Router } from "express";
import { AppContainer } from "../container/AppContainer";
import { AuthenticatedRequest, requireAuth } from "../middleware/requireAuth";
import { LLMClientFactory } from "@storyforge/llm-client";

// BYOK (Part 4): each user brings their own Gemini API key. Never
// returned to the frontend once saved -- every response here reports
// connected/not, never the key or its ciphertext.
export function settingsRoutes(app: AppContainer): Router {

    const router = Router();

    router.use(requireAuth(app));

    router.get("/api-key", async (req: AuthenticatedRequest, res) => {

        try {

            const connected = await app.auth.hasApiKey(req.userId!);

            res.json({ connected });

        }
        catch (error) {

            console.error("\n===== GET /settings/api-key failed =====\n", error, "\n==========================================\n");

            res.status(500).json({ error: "Could not check API key status right now." });

        }

    });

    router.put("/api-key", async (req: AuthenticatedRequest, res) => {

        const { apiKey } = req.body ?? {};

        if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {

            res.status(400).json({ error: "A valid API key is required." });

            return;

        }

        try {

            // Validate against the real Gemini API before ever
            // persisting it -- a tiny, cheap request, not a full
            // adventure generation.
            const testClient = LLMClientFactory.create({
                provider: "gemini",
                geminiApiKey: apiKey.trim()
            });

            await testClient.generate({
                prompt: "Reply with the single word: ok",
                responseFormat: "text",
                maxTokens: 5,
                metadata: { caller: "settingsRoutes", purpose: "validate_api_key" }
            });

            await app.auth.setApiKey(req.userId!, apiKey.trim());

            app.invalidateUserRuntime(req.userId!);

            res.json({ connected: true });

        }
        catch (error) {

            console.error("\n===== PUT /settings/api-key failed =====\n", error, "\n==========================================\n");

            res.status(400).json({ error: "That API key could not be validated. Please check it and try again." });

        }

    });

    router.delete("/api-key", async (req: AuthenticatedRequest, res) => {

        try {

            await app.auth.removeApiKey(req.userId!);

            app.invalidateUserRuntime(req.userId!);

            res.json({ connected: false });

        }
        catch (error) {

            console.error("\n===== DELETE /settings/api-key failed =====\n", error, "\n==========================================\n");

            res.status(500).json({ error: "Could not remove the API key right now." });

        }

    });

    return router;

}
