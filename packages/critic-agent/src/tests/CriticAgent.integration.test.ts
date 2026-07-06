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

import { CriticAgent } from "../agents/CriticAgent";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({
    path: path.resolve(__dirname, "../../../../.env")
});

async function main() {

    const memoryStore =
        new MemoryStore();

    const memory =
        new MemoryClient(memoryStore);

    const promptManager =
        new DefaultPromptManager(
            createPromptRepository()
        );

    const llm =
        new GeminiClient({

            apiKey:
                process.env.GEMINI_API_KEY!,

            model:
                process.env.GEMINI_MODEL!

        });

    const critic =
        new CriticAgent(

            memory,

            {

                llmClient: llm,

                promptManager

            }

        );

    const result =
        await critic.run({

            projectId: "demo",

            workflowRunId: "wf-001",

            executionId: "exec-001",

            agentName: "CriticAgent",

            input: {

                workflow: {

                    requirements: {

                        title: "",

                        genre: "Fantasy",

                        audience: {

                            name: "Children",

                            ageRange: "8-10",

                            readingLevel: "Easy",

                            vocabularyLevel: "Simple"

                        },

                        moral:
                            "Sharing brings happiness.",

                        tone:
                            "Warm",

                        theme:
                            "Friendship",

                        storyLength:
                            "Short Story"

                    },

                    plan: {

                        title:
                            "Luna and the Lumina Berries",

                        genre:
                            "Fantasy",

                        targetAudience: {

                            name: "Children",

                            ageRange: "8-10",

                            readingLevel: "Easy",

                            vocabularyLevel: "Simple"

                        },

                        tone:
                            "Warm",

                        moral:
                            "Sharing brings happiness.",

                        theme:
                            "Friendship",

                        setting:
                            "Whispering Woods",

                        estimatedReadingTime:
                            "8 minutes",

                        characters: [

                            {

                                id: "char-1",

                                name: "Luna",

                                role: "Hero",

                                personality:
                                    "Kind but shy"

                            },

                            {

                                id: "char-2",

                                name: "Flicker",

                                role: "Friend",

                                personality:
                                    "Cheerful"

                            }

                        ],

                        storyBeats: [

                            {

                                id: "beat-1",

                                order: 1,

                                title: "Discovery",

                                description:
                                    "Luna discovers magical berries."

                            },

                            {

                                id: "beat-2",

                                order: 2,

                                title: "Sharing",

                                description:
                                    "Luna shares the berries."

                            }

                        ]

                    },

                    research: {

                        writingGuidelines: [
                            "Show emotions."
                        ],

                        worldBuildingIdeas: [
                            "Magical glowing forest."
                        ],

                        characterDevelopmentIdeas: [
                            "Luna grows through sharing."
                        ],

                        conflictSuggestions: [
                            "Fear of losing treasure."
                        ],

                        educationalOpportunities: [
                            "Teach generosity."
                        ],

                        vocabularyGuidelines: [
                            "Use simple words."
                        ],

                        inspirations: [
                            "Classic fairy tales."
                        ]

                    },

                    draftStory: {

                        title: "Luna and the Lumina Berries",

                        content: "Luna found magical berries in the Whispering Woods. At first she wanted to keep them, but she decided to share them with Flicker. Together they discovered that sharing made everyone happier.",

                        wordCount: 38,

                        version: 1

                    }


                },
            },
        
            sharedMemory: {},

            config: {},

            metadata: {

                startedAt:
                    new Date(),

                retryCount: 0

            }

        });

    console.log(
        "\n===== Critique =====\n"
    );

    console.dir(
        result,
        {
            depth: null
        }
    );

    console.log(
        "\n===== Memory =====\n"
    );

    console.dir(

        memory.get(
            "storyCritique"
        ),

        {

            depth: null

        }

    );

}

main().catch(console.error);