// Correction pass: replaces ADVENTURE_BLUEPRINT_SCHEMA's role for
// initial generation. The entire `nodes` array -- topology, edges,
// per-node effects/emotion/eventType -- is GONE. That array was both
// the single largest driver of schema complexity (directly
// implicated in a live "too many states for serving" 400) and the
// reason Gemini could generate an unreachable node (a global
// graph-connectivity invariant that free-form per-node generation
// has no mechanism to guarantee). Structure is now built
// deterministically by InitialStoryBuilder; this schema only covers
// genuinely creative, adventure-level, one-time content.
export const ADVENTURE_METADATA_SCHEMA = {

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

        // Short non-prose phrase, NOT full narration -- see
        // Adventure.premise. Full opening prose is generated
        // separately, through the same NarrationRenderingService
        // path every other node uses.
        premise: { type: "STRING" }

    },

    required: ["title", "characters", "world", "learningPlan", "genome", "premise"]

};
