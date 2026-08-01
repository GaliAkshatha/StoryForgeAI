import { NarrationRenderingService } from "../services/NarrationRenderingService";
import { InMemoryStoryNodeRepository } from "../state/InMemoryStoryNodeRepository";
import { TextRenderer, RenderRequest, RenderResult } from "@storyforge/llm-client";
import { StoryNode } from "../models/StoryNode";
import { neutralEmotionProfile } from "../models/EmotionProfile";

class FixedRenderer implements TextRenderer {

    calls = 0;

    constructor(private readonly text: string, private readonly usedLabel: string) {}

    async render(): Promise<RenderResult> {

        this.calls++;

        return { text: this.text, rendererUsed: this.usedLabel };

    }

}

function frontierNode(id: string): StoryNode {

    return {

        id, adventureId: "a1", narrative: "",
        pendingRenderRequest: {
            ageRange: "7-8", tone: "fantasy_adventure", maxSentences: 3,
            location: "the clearing", actorName: "Ak", eventType: "helped_npc",
            narrativeSeed: "helps Squeak with the branch", complexity: "rich"
        },
        choices: [], learningSignals: [], emotion: neutralEmotionProfile(), effects: [],
        difficulty: 1, readingLevel: "7-8", isEnding: true, createdAt: new Date().toISOString()

    };

}

async function main(): Promise<void> {

    // --- Bad Gemini output -> deterministic fallback, NOT a 2nd Gemini call ---

    {

        const badGemini = new FixedRenderer("Ak gently pushes the", "gemini");

        const fallback = new FixedRenderer("Ak carefully helps Squeak move the branch aside.", "template");

        const repo = new InMemoryStoryNodeRepository();

        const service = new NarrationRenderingService(badGemini, repo, undefined, fallback);

        const rendered = await service.ensureRendered(frontierNode("node-1"));

        console.assert(
            rendered.narrative === "Ak carefully helps Squeak move the branch aside.",
            `Expected the deterministic fallback text to be used, got '${rendered.narrative}'`
        );

        console.assert(
            badGemini.calls === 1 && fallback.calls === 1,
            `Expected exactly 1 (rejected) Gemini call and 1 fallback call, got gemini=${badGemini.calls} fallback=${fallback.calls}`
        );

    }

    // --- Good Gemini output -> used as-is, fallback never touched ---

    {

        const goodGemini = new FixedRenderer("Ak carefully helps Squeak move the branch aside.", "gemini");

        const fallback = new FixedRenderer("should never be used", "template");

        const repo = new InMemoryStoryNodeRepository();

        const service = new NarrationRenderingService(goodGemini, repo, undefined, fallback);

        const rendered = await service.ensureRendered(frontierNode("node-2"));

        console.assert(
            rendered.narrative === "Ak carefully helps Squeak move the branch aside.",
            "Expected good Gemini output to be used directly"
        );

        console.assert(
            fallback.calls === 0,
            `Expected the fallback renderer to never be called for good output, got ${fallback.calls} calls`
        );

    }

    console.log("NarrationRenderingService quality-gate tests passed.");

}

main();
