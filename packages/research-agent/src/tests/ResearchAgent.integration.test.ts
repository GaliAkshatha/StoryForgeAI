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

import { ResearchAgent } from "../agents/ResearchAgent";

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

    const research =
        new ResearchAgent(

            memory,

            {

                llmClient: llm,

                promptManager

            }

        );

    const result =
        await research.run({

            projectId: "demo",

            workflowRunId: "wf-001",

            executionId: "exec-001",

            agentName: "ResearchAgent",

            input: {

                plan: {

                    title: "The Brave Little Fox",

                    genre: "Fantasy",

                    targetAudience: {

                        name: "Children",

                        ageRange: "8-10",

                        readingLevel: "Elementary",

                        vocabularyLevel: "Simple"

                    },

                    tone: "Warm",

                    moral: "Kindness always wins.",

                    theme: "Friendship",

                    setting: "Enchanted Forest",

                    estimatedReadingTime: "7 minutes",

                    characters: [

                        {

                            id: "c1",

                            name: "Finn",

                            role: "Hero",

                            personality: "Brave and kind"

                        }

                    ],

                    storyBeats: [

                        {

                            id: "b1",

                            order: 1,

                            title: "Beginning",

                            description: "Finn begins his adventure."

                        }

                    ]

                }

            },

            sharedMemory: {},

            config: {},

            metadata: {

                startedAt: new Date(),

                retryCount: 0

            }

        });

    console.log(
        "\n===== Research Result =====\n"
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

        memory.get("researchPackage"),

        {
            depth: null
        }

    );

}

main().catch(console.error);