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
        premise: { type: "STRING" },

        // Stabilization pass (Part 1/3): a SHORT, distinct SITUATION
        // phrase -- what needs to be done or solved -- explicitly
        // NOT a restatement of a character's name+description. This
        // is what choice text (ChoiceTextBuilder) interpolates; using
        // `premise` for that purpose was the root cause of choices
        // like "Help Pip with A small bird named Pip is tearfully
        // guarding...".
        initialProblem: { type: "STRING" },

        // Story arc pass: a SHORT structured plot outline -- the
        // genuine authored arc (setup, complication, the moral fork
        // itself, a test of that choice, resolution) as controlled
        // phrases, NOT prose and NOT a character bio. This is what
        // makes the difference between "connected random events" and
        // an actual story with a twist: the deterministic engine
        // reads these beats to decide what SHOULD happen next,
        // rather than picking unrelated events. Exactly 5 beats.
        plotOutline: {

            type: "ARRAY",

            items: {

                type: "OBJECT",

                properties: {

                    beat: {

                        type: "STRING",

                        enum: ["hook", "complication", "moral_fork", "test", "resolution"]

                    },

                    // Short scene-level summary, not prose narration.
                    summary: { type: "STRING" },

                    // The fields below form the causal story spine.
                    // They tell the runtime what the beat is FOR and
                    // how the player's moral choice changes the story.
                    objective: { type: "STRING" },
                    sceneGoal: { type: "STRING" },
                    conflict: { type: "STRING" },
                    stakes: { type: "STRING" },
                    choiceA: { type: "STRING" },
                    choiceB: { type: "STRING" },
                    consequenceA: { type: "STRING" },
                    consequenceB: { type: "STRING" },
                    requiredReveal: { type: "STRING" }

                },

                required: [
                    "beat", "summary", "objective", "sceneGoal", "conflict",
                    "stakes", "choiceA", "choiceB", "consequenceA",
                    "consequenceB", "requiredReveal"
                ]

            }

        },

        // Choice-variety pass: instead of one fixed hardcoded phrase
        // per event type reused identically across EVERY adventure
        // (the actual cause of choices feeling "lame" -- "Take the
        // lead with X" every single time, regardless of theme), each
        // adventure gets its own short, tonally-matched phrase per
        // type, generated once here alongside everything else. Use
        // the literal placeholder "{target}" where the phrase needs
        // to name who it's directed at -- never a real name (this is
        // a template, filled in deterministically at choice-build
        // time, not live text). Types with no target (solved_puzzle,
        // failed_puzzle, retried, ignored_warning, explored, observed)
        // must NOT include "{target}". Every phrase: 2-6 words, an
        // ACTION the player can take, never a hint at what happens
        // next or how it turns out.
        choiceTemplates: {

            type: "OBJECT",

            properties: {

                helped_npc: { type: "STRING" },
                asked_questions: { type: "STRING" },
                shared_resources: { type: "STRING" },
                led_team: { type: "STRING" },
                solved_puzzle: { type: "STRING" },
                failed_puzzle: { type: "STRING" },
                retried: { type: "STRING" },
                ignored_warning: { type: "STRING" },
                explored: { type: "STRING" },
                observed: { type: "STRING" }

            },

            required: [
                "helped_npc", "asked_questions", "shared_resources", "led_team",
                "solved_puzzle", "failed_puzzle", "retried", "ignored_warning",
                "explored", "observed"
            ]

        }

    },

    required: [
        "title", "characters", "world", "learningPlan", "genome",
        "premise", "initialProblem", "plotOutline", "choiceTemplates"
    ]

};
