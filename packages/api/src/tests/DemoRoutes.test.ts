import http from "http";
import express from "express";
import { AppContainer } from "../container/AppContainer";
import { demoRoutes } from "../routes/demoRoutes";
import { DependencyContainer } from "@storyforge/workflow-engine";
import { LLMClient, LLMRequest, LLMResponse } from "@storyforge/llm-client";

// Proves the guest demo flow works end-to-end through the REAL
// AdventureRuntime -- no live network needed (same canned-response
// pattern the workflow-engine integration tests already use) -- and
// that it's genuinely isolated: no auth required, no data reachable
// through the real app.adventures/app.learning at all.

const METADATA_RESPONSE = JSON.stringify({
    title: "The Whispering Wood",
    characters: [{ id: "fox", name: "Fenn", role: "guide", description: "A quiet fox." }],
    world: { setting: "forest", description: "An old, quiet forest." },
    learningPlan: [{ skillFocus: "honesty", approach: "natural consequence" }],
    genome: {
        theme: "honesty", explorationLevel: 0.6, humor: 0.3, mystery: 0.4,
        fantasyDensity: 0.7, puzzleDensity: 0.2, npcComplexity: 0.3, vocabulary: "simple"
    },
    premise: "a fox named Fenn waits quietly at the treeline",
    initialProblem: "a fallen branch blocks the path",
    plotOutline: [
        { beat: "hook", summary: "a friend needs help" },
        { beat: "complication", summary: "it gets harder" },
        { beat: "moral_fork", summary: "decide whether to admit a mistake" },
        { beat: "test", summary: "someone learns what really happened" },
        { beat: "resolution", summary: "trust is rebuilt" }
    ]
});

class FakeLLMClient implements LLMClient {

    async generate(request: LLMRequest): Promise<LLMResponse> {

        let text: string;

        if (request.prompt.includes("\"premise\": \"\"")) {
            text = METADATA_RESPONSE;
        }
        else if (request.prompt.includes("SECOND PERSON")) {
            text = "Something meaningful happens, rendered by the fake Gemini renderer.";
        }
        else {
            throw new Error(`FakeLLMClient: no canned response for: ${request.prompt.slice(0, 80)}`);
        }

        return { text, model: "fake-model", finishReason: "STOP" };

    }

}

function noNetworkKnowledgeBase(): unknown {

    return { query: async () => [], queryAsContext: async () => "(none)" };

}

async function postJson(port: number, path: string, body: unknown): Promise<{ status: number; json: any }> {

    return new Promise((resolve, reject) => {

        const data = JSON.stringify(body);

        const req = http.request(

            { hostname: "localhost", port, path, method: "POST", headers: {
                "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data)
            } },

            res => {

                let raw = "";

                res.on("data", chunk => raw += chunk);

                res.on("end", () => {

                    try {
                        resolve({ status: res.statusCode ?? 0, json: JSON.parse(raw) });
                    }
                    catch (e) {
                        reject(e);
                    }

                });

            }

        );

        req.on("error", reject);

        req.write(data);

        req.end();

    });

}

async function main(): Promise<void> {

    const app = new AppContainer({

        persistence: "memory",
        jwtSecret: "test-secret-for-demo-routes",
        provider: "gemini",
        geminiApiKey: "unused-fake-key"

    });

    // Swap in the fake, network-free LLM client for the demo runtime
    // specifically -- same injection point the app itself uses.
    (app as unknown as { demoAdventures: unknown }).demoAdventures =
        new (await import("@storyforge/workflow-engine")).AdventureRuntime(

            (() => {

                const container = new DependencyContainer({ llmClient: new FakeLLMClient() });

                (container as unknown as { knowledgeBase: unknown }).knowledgeBase =
                    noNetworkKnowledgeBase();

                return container;

            })()

        );

    const expressApp = express();

    expressApp.use(express.json());

    expressApp.use("/api/demo", demoRoutes(app));

    const server = expressApp.listen(0);

    const port = (server.address() as { port: number }).port;

    try {

        // --- No auth header at all -- this must work ---

        const startResponse = await postJson(port, "/api/demo/start", {
            skill: "honesty", location: "a quiet forest"
        });

        console.assert(
            startResponse.status === 200,
            `Expected demo start to succeed with no auth, got status ${startResponse.status}: ${JSON.stringify(startResponse.json)}`
        );

        console.assert(
            typeof startResponse.json.worldId === "string" && typeof startResponse.json.narrative === "string",
            `Expected a real worldId and narrative back, got ${JSON.stringify(startResponse.json)}`
        );

        console.assert(
            Array.isArray(startResponse.json.choices) && startResponse.json.choices.length > 0,
            "Expected real choices back from the actual engine"
        );

        // --- A real turn, using the choice id from start ---

        const { worldId, sessionId, choices } = startResponse.json;

        const turnResponse = await postJson(port, "/api/demo/turn", {
            worldId, sessionId, selectedChoiceId: choices[0].id
        });

        console.assert(
            turnResponse.status === 200 && typeof turnResponse.json.narrative === "string",
            `Expected a real second turn to succeed, got status ${turnResponse.status}: ${JSON.stringify(turnResponse.json)}`
        );

        // --- Missing fields are rejected cleanly ---

        const badResponse = await postJson(port, "/api/demo/start", { skill: "honesty" });

        console.assert(
            badResponse.status === 400,
            `Expected 400 for a missing location, got ${badResponse.status}`
        );

        console.log("Demo routes tests passed.");

    }
    finally {

        server.close();

    }

}

main().catch(error => {

    console.error(error);

    process.exitCode = 1;

});
