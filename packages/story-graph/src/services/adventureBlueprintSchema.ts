// JSON-Schema-shaped (OpenAPI subset) description of the Adventure
// Blueprint response, passed as LLMRequest.responseSchema so the
// provider does constrained decoding rather than best-effort JSON --
// this output is large and structurally strict (every edge must
// resolve), so this matters even more here than for the smaller
// per-turn prompts it replaces. Kept as a plain object, not
// importing @google/genai's Type enum, so story-graph stays
// provider-agnostic -- GeminiClient is the only place that casts
// this to the SDK's own Schema type.
export const ADVENTURE_BLUEPRINT_SCHEMA = {

    type: "OBJECT",

    properties: {

        title: { type: "STRING" },

        characters: {

            type: "ARRAY",

            items: {

                type: "OBJECT",

                properties: {

                    id: { type: "STRING" },

                    name: { type: "STRING" },

                    role: { type: "STRING" },

                    description: { type: "STRING" }

                },

                required: ["id", "name", "role", "description"]

            }

        },

        world: {

            type: "OBJECT",

            properties: {

                setting: { type: "STRING" },

                description: { type: "STRING" }

            },

            required: ["setting", "description"]

        },

        learningPlan: {

            type: "ARRAY",

            items: {

                type: "OBJECT",

                properties: {

                    skillFocus: { type: "STRING" },

                    approach: { type: "STRING" }

                },

                required: ["skillFocus", "approach"]

            }

        },

        emotionCurve: {

            type: "ARRAY",

            items: {

                type: "OBJECT",

                properties: {

                    label: { type: "STRING" },

                    excitement: { type: "NUMBER" },

                    tension: { type: "NUMBER" }

                },

                required: ["label", "excitement", "tension"]

            }

        },

        rootNodeId: { type: "STRING" },

        genome: {

            type: "OBJECT",

            properties: {

                theme: { type: "STRING" },

                explorationLevel: { type: "NUMBER" },

                humor: { type: "NUMBER" },

                mystery: { type: "NUMBER" },

                fantasyDensity: { type: "NUMBER" },

                puzzleDensity: { type: "NUMBER" },

                npcComplexity: { type: "NUMBER" },

                vocabulary: { type: "STRING" }

            },

            required: [
                "theme", "explorationLevel", "humor", "mystery",
                "fantasyDensity", "puzzleDensity", "npcComplexity", "vocabulary"
            ]

        },

        nodes: {

            type: "ARRAY",

            minItems: "10",

            maxItems: "16",

            items: {

                type: "OBJECT",

                properties: {

                    id: { type: "STRING" },

                    narrative: { type: "STRING" },

                    choices: {

                        type: "ARRAY",

                        items: {

                            type: "OBJECT",

                            properties: {

                                id: { type: "STRING" },

                                text: { type: "STRING" },

                                nextNodeId: { type: "STRING" }

                            },

                            required: ["id", "text", "nextNodeId"]

                        }

                    },

                    learningSignals: {

                        type: "ARRAY",

                        items: { type: "STRING" }

                    },

                    emotion: {

                        type: "OBJECT",

                        properties: {

                            excitement: { type: "NUMBER" },

                            curiosity: { type: "NUMBER" },

                            confidence: { type: "NUMBER" },

                            fear: { type: "NUMBER" },

                            wonder: { type: "NUMBER" },

                            frustration: { type: "NUMBER" },

                            pride: { type: "NUMBER" },

                            calm: { type: "NUMBER" }

                        },

                        required: [
                            "excitement", "curiosity", "confidence", "fear",
                            "wonder", "frustration", "pride", "calm"
                        ]

                    },

                    effects: {

                        type: "ARRAY",

                        items: {

                            type: "OBJECT",

                            properties: {

                                type: { type: "STRING" },

                                payload: { type: "OBJECT" }

                            },

                            required: ["type", "payload"]

                        }

                    },

                    difficulty: { type: "NUMBER" },

                    readingLevel: { type: "STRING" },

                    isEnding: { type: "BOOLEAN" },

                    endingType: { type: "STRING" },

                    eventType: { type: "STRING" }

                },

                required: [
                    "id", "narrative", "choices", "learningSignals", "emotion",
                    "effects", "difficulty", "readingLevel", "isEnding"
                ]

            }

        }

    },

    required: [
        "title", "characters", "world", "learningPlan",
        "emotionCurve", "genome", "rootNodeId", "nodes"
    ]

};
