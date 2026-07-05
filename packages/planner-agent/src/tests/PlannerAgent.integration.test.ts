import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    MemoryStore,
    MemoryClient
} from "@storyforge/agent-sdk";

import {
    GeminiClient
} from "@storyforge/llm-client";

import {
    DefaultPromptManager,
    createPromptRepository
} from "@storyforge/prompt-manager";

import { PlannerAgent } from "../agents/PlannerAgent";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
    path: path.resolve(__dirname, "../../../../.env")
});

async function main() {

    const memoryStore = new MemoryStore();

    const memory = new MemoryClient(
        memoryStore
    );

    const repository =
        createPromptRepository();

    const promptManager =
        new DefaultPromptManager(
            repository
        );

    const llm =
        new GeminiClient({

            apiKey: process.env.GEMINI_API_KEY!,

            model: process.env.GEMINI_MODEL!

        });

    const planner =
        new PlannerAgent(

            memory,

            {

                llmClient: llm,

                promptManager

            }

        );

    const result =
        await planner.run({

            projectId: "demo",

            workflowRunId: "wf-001",

            executionId: "exec-001",

            agentName: "PlannerAgent",

            input: {

                moral:
                    "Honesty is the best policy.",

                audience: {

                    name: "Children",

                    ageRange: "8-10",

                    readingLevel: "Elementary",

                    vocabularyLevel: "Simple"

                },

                genre:
                    "Fantasy"

            },

            sharedMemory: {},

            config: {},

            metadata: {

                startedAt: new Date(),

                retryCount: 0

            }

        });

    console.log(
        "\n===== Planner Result =====\n"
    );

    console.dir(
        result,
        {
            depth: null
        }
    );

    console.log(
        "\n===== Execution Memory =====\n"
    );

    console.dir(

        memory.get("storyPlan"),

        {
            depth: null
        }

    );

}

main().catch(console.error);