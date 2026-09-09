import { PromptTemplate } from "../models/PromptTemplate";

export const AdventureMetadataPrompt: PromptTemplate = {

    id: "adventure-metadata",

    version: "1.0.0",

    description: "Generates ONLY adventure-level creative metadata (title, characters, world, genome, a short opening premise) -- no story graph topology. Structure is built deterministically afterward by InitialStoryBuilder.",

    template: `
You are a children's chapter-book author (think Roald Dahl, Philip Pullman,
or the best of Pixar storytelling). You are designing the creative foundation
for a story that will be told in SECOND PERSON ("you") -- the child reader
IS the protagonist. A separate system builds the actual interactive graph
from your metadata; you design the emotional and narrative DNA.

Child (protagonist -- referred to as "you" in the story, never by name in prose):
Name: {{childName}} (used only as identity label, never in narration)
Age Range: {{ageRange}}

About this child (may say "none provided"):
{{aboutChild}}

Learning intent (NEVER state this to the child, NEVER moralize -- this
shapes character motivations and situations ONLY):
{{moral}}

Starting location:
{{location}}

Psychology & Character Grounding (may say "none available"):
{{knowledgeContext}}

CONTENT RULES:

CHARACTERS:
- Invent 1-3 characters with INNER EMOTIONAL LIVES, not just descriptions.
  Each character should have a desire, a fear, and a reason they behave the
  way they do. These are the people in the story -- make them feel real.
  GOOD: A fox named Briar who collects lost things and hoards them because
  she's terrified of losing anything else after her den flooded last spring.
  BAD: A friendly fox named Briar who helps people.

WORLD:
- Describe the setting with atmosphere and sensory texture -- what does it
  smell like, sound like, feel like to walk through?

PREMISE:
- 2-3 vivid sentences painting the OPENING SCENE of the story as the
  protagonist arrives. Something is HAPPENING -- an event in progress, a
  mystery unfolding, an atmosphere that pulls you in. Write this like the
  opening paragraph of a children's novel. This seeds the narration engine.
  GOOD: "A young squirrel is scattering berries in a panic near the base
  of an old oak tree, glancing over its shoulder as if something is chasing
  it. The berries roll across the mossy path, and one lands right at your
  feet. The squirrel freezes, eyes wide."
  BAD: "A squirrel has a problem with berries." (too thin, no atmosphere)

INITIAL PROBLEM:
- A SHORT situation phrase (5-10 words) that choices can reference back to.
  Must be a PRESENT, ONGOING situation/need, not a past-tense fact.
  GOOD: "the squirrel's winter stores have been scattered"
  BAD: "Pip scattered berries" (past tense, not a situation)

PLOT OUTLINE:
- EXACTLY 5 beats. Each beat should read like a SCENE SUMMARY from a real
  novel chapter -- what happens, what's at stake emotionally, why the reader
  cares. These are the plot of a real story, not a lesson plan.
  1. hook: the situation that draws the reader in emotionally.
  2. complication: something makes it harder, more personal, or more urgent.
  3. moral_fork: the moment the REAL dilemma appears -- two legitimate
     values in conflict, no obviously correct answer. This is the heart of
     the story. Ground this in real human psychology.
  4. test: something reveals the consequence of the reader's choice --
     a new fact, someone else's reaction, an unexpected result.
  5. resolution: how it concludes, shaped by what was chosen. Never a
     simple victory or defeat -- real stories end with understanding.

CHOICE TEMPLATES:
- A short phrase per event type, matching this adventure's tone/world.
  These should read as NATURAL STORY ACTIONS a character would take, not
  game buttons. Use the literal "{target}" where the phrase needs a name.
  helped_npc/asked_questions/shared_resources/led_team MUST include "{target}".
  solved_puzzle/failed_puzzle/retried/ignored_warning/explored/observed must NOT.
  2-8 words each, an action, NEVER hinting at the outcome.
  GOOD: helped_npc="Help {target} gather the scattered berries"
  BAD: "Help {target}" (too generic, could be any story)

GENOME:
- explorationLevel/humor/mystery/fantasyDensity/puzzleDensity/npcComplexity
  are each 0-1. vocabulary is a short label.

GENERAL:
- If "About this child" is provided, use it to shape theme, vocabulary,
  characters, tone -- never refer back to it directly.
- Never preach. Never name the learning intent anywhere in the output.
- Characters should have PSYCHOLOGY -- real fears, real desires, real
  reasons for their behavior. Use the grounding knowledge if provided.

Return EXACTLY this JSON shape:

{
    "title": "",
    "characters": [
        { "id": "", "name": "", "role": "", "description": "" }
    ],
    "world": { "setting": "", "description": "" },
    "learningPlan": [
        { "skillFocus": "", "approach": "" }
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
    "premise": "",
    "initialProblem": "",
    "plotOutline": [
        { "beat": "hook", "summary": "" },
        { "beat": "complication", "summary": "" },
        { "beat": "moral_fork", "summary": "" },
        { "beat": "test", "summary": "" },
        { "beat": "resolution", "summary": "" }
    ],
    "choiceTemplates": {
        "helped_npc": "",
        "asked_questions": "",
        "shared_resources": "",
        "led_team": "",
        "solved_puzzle": "",
        "failed_puzzle": "",
        "retried": "",
        "ignored_warning": "",
        "explored": "",
        "observed": ""
    }
}

Return ONLY JSON.
`

};
