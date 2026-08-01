// Shares the same per-node shape as ADVENTURE_BLUEPRINT_SCHEMA's
// "nodes" entries (see adventureBlueprintSchema.ts) -- duplicated
// here rather than imported/composed so each schema stays a single
// flat literal, which is what keeps them easy to eyeball against
// their matching prompt template.
const NODE_SCHEMA = {

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

        // Collapsed to a single JSON-encoded STRING -- see
        // adventureBlueprintSchema.ts for why (a nested array of
        // objects with many optional properties, repeated per node,
        // is exactly what multiplies a constrained-decoding
        // automaton's state count; a string field removes that
        // nested structure from the schema entirely).
        effectsJson: { type: "STRING" },

        difficulty: { type: "NUMBER" },

        readingLevel: { type: "STRING" },

        isEnding: { type: "BOOLEAN" },

        endingType: { type: "STRING" },

        eventType: { type: "STRING" }

    },

    required: [
        "id", "narrative", "choices", "learningSignals", "emotion",
        "effectsJson", "difficulty", "readingLevel", "isEnding"
    ]

};

export const ADVENTURE_EXPANSION_SCHEMA = {

    type: "OBJECT",

    properties: {

        entryChoices: {

            type: "ARRAY",

            minItems: "4",

            maxItems: "4",

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

        nodes: {

            type: "ARRAY",

            items: NODE_SCHEMA

        }

    },

    required: ["entryChoices", "nodes"]

};
