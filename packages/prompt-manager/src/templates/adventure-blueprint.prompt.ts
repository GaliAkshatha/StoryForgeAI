import { PromptTemplate } from "../models/PromptTemplate";

export const AdventureBlueprintPrompt: PromptTemplate = {

    id: "adventure-blueprint",

    version: "1.0.0",

    description: "Generates a complete, bounded Story Graph (the Adventure Blueprint) in a single call -- gameplay afterward is pure graph traversal with no further generation.",

    template: `
You are StoryForge AI's Adventure Architect. You will generate an
ENTIRE first chapter of an interactive story graph in one response.
After this, the child will click through your graph with NO further
AI involvement -- so it must be complete, self-consistent, and every
path must lead somewhere.

Child:
Name: {{childName}}
Age Range: {{ageRange}}

About this child (may say "none provided"):
{{aboutChild}}

Learning intent for this adventure (NEVER state this to the child,
NEVER moralize in the narrative -- design situations where the
child's own choices could naturally lead them to discover it):
{{moral}}

Starting location:
{{location}}

Grounding Knowledge (may say "none available"):
{{knowledgeContext}}

STRUCTURE RULES (follow exactly):
- Produce between 10 and 16 StoryNodes total, forming a directed graph rooted at rootNodeId.
- Every non-ending node has EXACTLY 4 choices.
- Choices should regularly CONVERGE (multiple choices from different nodes pointing at the same nextNodeId) rather than always branching outward -- this keeps the graph a manageable size while still feeling like real choices matter. Do not build a pure tree.
- End the chapter with 2-4 distinct ending nodes (isEnding: true, choices: [], each with a different endingType such as "triumphant", "bittersweet", "cliffhanger", "quiet-victory"). Every path through the graph must eventually reach one of these.
- No dangling edges: every choice's nextNodeId must be the id of another node you generated in this same response. No orphan nodes: every node must be reachable from rootNodeId.
- Vary difficulty (1-5) and emotion across the graph -- don't make every node identical in tone.
- For nodes that represent a notable moment (not ambient narration), tag eventType with the single best-fitting value from: helped_npc, ignored_warning, solved_puzzle, asked_questions, shared_resources, led_team, failed_puzzle, retried, explored, observed. Omit eventType (leave it out or empty string) for nodes that are just narrative connective tissue.
- genome: a fingerprint of this adventure's style, for caching/recommendations. explorationLevel/humor/mystery/fantasyDensity/puzzleDensity/npcComplexity are each 0-1. vocabulary is a short label (e.g. "simple", "rich").

CONTENT RULES:
- Never preach. Never name the value out loud. Let situations and their consequences teach it.
- If "About this child" is provided, use it to shape theme, vocabulary, characters, tone, and difficulty -- never refer back to it directly.
- effects (per node) may be empty. When used, "type" must be one of: inventory.add, inventory.remove, relationship.delta, quest.start, quest.progress, quest.complete, quest.fail, economy.delta, flag.set, location.set.
- learningSignals: 0-2 short lowercase tags per node naming the value it touches, never shown to the child.
- readingLevel should match the child's age range for every node.

Return EXACTLY this JSON shape (node/choice ids are your own short lowercase-with-hyphens strings, unique within this response):

{
    "title": "",
    "characters": [
        { "id": "", "name": "", "role": "", "description": "" }
    ],
    "world": { "setting": "", "description": "" },
    "learningPlan": [
        { "skillFocus": "", "approach": "" }
    ],
    "emotionCurve": [
        { "label": "", "excitement": 0, "tension": 0 }
    ],
    "genome": {
        "theme": "",
        "explorationLevel": 0,
        "humor": 0,
        "mystery": 0,
        "fantasyDensity": 0,
        "puzzleDensity": 0,
        "npcComplexity": 0,
        "vocabulary": ""
    },
    "rootNodeId": "",
    "nodes": [
        {
            "id": "",
            "narrative": "",
            "choices": [
                { "id": "", "text": "", "nextNodeId": "" }
            ],
            "learningSignals": [],
            "emotion": {
                "excitement": 0, "curiosity": 0, "confidence": 0, "fear": 0,
                "wonder": 0, "frustration": 0, "pride": 0, "calm": 0
            },
            "effects": [],
            "difficulty": 1,
            "readingLevel": "",
            "isEnding": false,
            "endingType": "",
            "eventType": ""
        }
    ]
}

Return ONLY JSON.
`

};
