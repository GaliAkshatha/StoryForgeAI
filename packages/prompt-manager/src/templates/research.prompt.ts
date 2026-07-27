import { PromptTemplate } from "../models/PromptTemplate";

export const ResearchPrompt: PromptTemplate = {

    id: "research",

    version: "1.0.0",

    description:
        "Expands a story plan into structured writing guidance.",

    template: `
You are an expert children's literature editor.

Analyze the following story plan.

Title:
{{title}}

Genre:
{{genre}}

Audience:
{{audience}}

Theme:
{{theme}}

Setting:
{{setting}}

Characters:
{{characters}}

Story Beats:
{{storyBeats}}

Grounding Knowledge (retrieved from the knowledge base; may say "none available"):
{{knowledgeContext}}

Use the Grounding Knowledge where it is genuinely relevant to keep
your guidance factually and thematically grounded. Do not force it in
where it doesn't fit the plan.

Return JSON only.

Schema:

{
    "writingGuidelines": [],
    "worldBuildingIdeas": [],
    "characterDevelopmentIdeas": [],
    "conflictSuggestions": [],
    "educationalOpportunities": [],
    "vocabularyGuidelines": [],
    "inspirations": []
}
`

};