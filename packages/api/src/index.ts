import { config } from "dotenv";

// override: true is deliberate and important here -- without it,
// dotenv's documented default behavior is to NEVER overwrite an
// already-set process.env value. tsx (the dev runner) has its own
// built-in .env auto-loading that can run before this file's own
// config() call, and a leftover system-level DATABASE_URL/PERSISTENCE
// from an unrelated project would otherwise silently win over
// whatever's actually in packages/api/.env -- exactly the class of
// bug that caused a real deployment to try connecting to a stale,
// unrelated Supabase project instead of respecting PERSISTENCE=memory.
config({ override: true });

import express from "express";
import cors from "cors";

import { AppContainer } from "./container/AppContainer";

import { authRoutes } from "./routes/authRoutes";
import { parentRoutes } from "./routes/parentRoutes";
import { childrenRoutes } from "./routes/childrenRoutes";
import { adventureRoutes } from "./routes/adventureRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { settingsRoutes } from "./routes/settingsRoutes";
import { demoRoutes } from "./routes/demoRoutes";

const app = express();

app.use(cors());

app.use(express.json());

if (!process.env.JWT_SECRET) {

    throw new Error(
        "JWT_SECRET is required. Set it in your .env before starting the API."
    );

}

const container = new AppContainer({

    // Defaults to "gemini" if LLM_PROVIDER is unset -- Gemini is the
    // default provider as of v2.0. Set LLM_PROVIDER=ollama to opt
    // back into a fully local/offline setup.
    provider: (process.env.LLM_PROVIDER as "gemini" | "ollama") ?? "gemini",

    geminiApiKey: process.env.GEMINI_API_KEY,

    geminiModel: process.env.GEMINI_MODEL,

    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,

    ollamaModel: process.env.OLLAMA_MODEL,

    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL,

    // Defaults to "memory" -- a missing or misconfigured .env should
    // never silently attempt a Postgres connection. This is exactly
    // the failure mode a real user hit: PERSISTENCE wasn't actually
    // set, the old "postgres" default kicked in, and a leftover
    // system-level DATABASE_URL from an unrelated project got used,
    // producing a confusing ENOTFOUND/tenant-not-found error instead
    // of the app just working in memory mode. Set PERSISTENCE=postgres
    // explicitly (with a real DATABASE_URL) when you actually want it.
    persistence: (process.env.PERSISTENCE as "postgres" | "memory") ?? "memory",

    jwtSecret: process.env.JWT_SECRET,

    encryptionKey: process.env.ENCRYPTION_KEY,

    tokenTtlSeconds: process.env.JWT_TTL_SECONDS
        ? Number(process.env.JWT_TTL_SECONDS)
        : undefined

});

app.get("/health", (_req, res) => {

    res.json({ status: "ok" });

});

app.use("/api/auth", authRoutes(container));

app.use("/api/parents", parentRoutes(container));

app.use("/api/children", childrenRoutes(container));

app.use("/api/adventures", adventureRoutes(container));

app.use("/api/reports", reportRoutes(container));
app.use("/api/settings", settingsRoutes(container));

app.use("/api/demo", demoRoutes(container));

const port = Number(process.env.PORT ?? 4000);

const server = app.listen(port, () => {

    console.log(`StoryForge API listening on http://localhost:${port}`);

});

async function shutdown() {

    server.close();

    await container.shutdown();

    process.exit(0);

}

process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);
