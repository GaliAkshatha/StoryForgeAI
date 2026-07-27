import { config } from "dotenv";

config();

import express from "express";
import cors from "cors";

import { AppContainer } from "./container/AppContainer";

import { authRoutes } from "./routes/authRoutes";
import { parentRoutes } from "./routes/parentRoutes";
import { childrenRoutes } from "./routes/childrenRoutes";
import { adventureRoutes } from "./routes/adventureRoutes";
import { reportRoutes } from "./routes/reportRoutes";

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

    // Defaults to "postgres" -- requires DATABASE_URL. Set
    // PERSISTENCE=memory for local dev/tests without a database.
    persistence: (process.env.PERSISTENCE as "postgres" | "memory") ?? "postgres",

    jwtSecret: process.env.JWT_SECRET,

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
