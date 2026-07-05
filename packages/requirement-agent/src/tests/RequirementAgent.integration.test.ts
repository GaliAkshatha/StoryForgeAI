import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    MemoryClient,
    MemoryStore
} from "@storyforge/agent-sdk";

import {
    GeminiClient
} from "@storyforge/llm-client";

import {
    DefaultPromptManager,
    createPromptRepository
} from "@storyforge/prompt-manager";

import { RequirementAgent } from "../agents/RequirementAgent";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
    path: path.resolve(__dirname, "../../../../.env")
});

async function main() {

    const memory = new MemoryClient(
        new MemoryStore()
    );

    const promptManager =
        new DefaultPromptManager(
            createPromptRepository()
        );

    const llm =
        new GeminiClient({

            apiKey: process.env.GEMINI_API_KEY!,

            model: process.env.GEMINI_MODEL!

        });

    const agent =
        new RequirementAgent(

            memory,

            {

                llmClient: llm,

                promptManager

            }

        );

    const result =
        await agent.run({

            projectId: "demo",

            workflowRunId: "wf-001",

            executionId: "exec-001",

            agentName: "RequirementAgent",

            input: {

                prompt:
                    "I want a funny fantasy story about a lonely dragon who learns sharing."

            },

            sharedMemory: {},

            config: {},

            metadata: {

                startedAt: new Date(),

                retryCount: 0

            }

        });

    console.log(
        "\n===== Requirement Result =====\n"
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

        memory.get("storyRequirements"),

        {
            depth: null
        }

    );

}

main().catch(console.error);