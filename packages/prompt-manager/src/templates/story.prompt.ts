import { PromptTemplate } from "../models/PromptTemplate";

export const StoryPrompt: PromptTemplate = {

    id: "story",

    version: "1.0.0",

    description:
        "Generates a complete story from a workflow context.",

    template: `
You are an award-winning children's story author.

Your task is to write ONE complete story.

Strictly follow ALL of the information below.

--------------------------------------------------
STORY REQUIREMENTS
--------------------------------------------------

Genre:
{{genre}}

Audience:
{{audience}}

Moral:
{{moral}}

Theme:
{{theme}}

Tone:
{{tone}}

Story Length:
{{storyLength}}

--------------------------------------------------
STORY PLAN
--------------------------------------------------

Title:
{{title}}

Setting:
{{setting}}

Estimated Reading Time:
{{readingTime}}

Characters:

{{characters}}

Story Beats:

{{storyBeats}}

--------------------------------------------------
RESEARCH GUIDANCE
--------------------------------------------------

Writing Guidelines:

{{writingGuidelines}}

World Building Ideas:

{{worldBuildingIdeas}}

Character Development Ideas:

{{characterDevelopmentIdeas}}

Conflict Suggestions:

{{conflictSuggestions}}

Educational Opportunities:

{{educationalOpportunities}}

Vocabulary Guidelines:

{{vocabularyGuidelines}}

Inspirations:

{{inspirations}}

--------------------------------------------------
REVISION MODE
--------------------------------------------------

Existing Draft:

{{draftStory}}

Critique:

{{critique}}

If both "draftStory" and "critique" are provided,
you MUST revise the existing story instead of writing
a completely new one.

When revising:

- Preserve the original storyline.
- Improve weak sections.
- Fix all critique points.
- Preserve title unless critique requests otherwise.
- Keep the same audience.
- Keep the same moral.
- Keep the same theme.
- Keep continuity.
- Increase version by 1.

If draftStory is empty,
generate a completely new story.

--------------------------------------------------
RULES
--------------------------------------------------

1. Follow every story beat in order.

2. Do NOT introduce major new characters.

3. Do NOT change the moral.

4. Maintain each character's personality.

5. Keep vocabulary appropriate for the audience.

6. Make dialogue natural.

7. Write smooth transitions between beats.

8. Finish the story completely.

9. Return ONLY valid JSON.

--------------------------------------------------
JSON SCHEMA
--------------------------------------------------

{
    "title": "...",

    "content": "...",

    "wordCount": 0,

    "version": 1
}
`

};