import { PromptTemplate } from "../models/PromptTemplate";

export const RequirementPrompt: PromptTemplate = {

    id: "requirement",

    version: "1.0.0",

    description: "Extract structured story requirements from user input.",

    template: `
You are StoryForge AI's Requirement Agent.

Your job is to analyze the user's request and extract structured story requirements.

Return ONLY valid JSON.

User Request:

{{prompt}}

Return EXACTLY this JSON:

{
    "title": "",
    "genre": "",
    "audience": "",
    "moral": "",
    "tone": "",
    "theme": "",
    "storyLength": "",
    "readingLevel": ""
}

Rules:

- Infer missing fields intelligently.
- Keep values concise.
- Return ONLY JSON.
- Do not use markdown.
- Do not explain your reasoning.
`

};