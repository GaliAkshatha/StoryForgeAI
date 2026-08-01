import { DeterministicExpansionService } from "../services/DeterministicExpansionService";
import { CandidateEventGenerator } from "../services/CandidateEventGenerator";
import { ConstraintEngine } from "../services/ConstraintEngine";
import { EventScorer } from "../services/EventScorer";
import { MemoryRetrievalService } from "../services/MemoryRetrievalService";
import { SemanticEventBuilder } from "../services/SemanticEventBuilder";
import { NarrationRenderingService } from "../services/NarrationRenderingService";
import { InMemoryStoryNodeRepository } from "../state/InMemoryStoryNodeRepository";
import { createInitialWorldState } from "@storyforge/simulation-engine";
import { TextRenderer, RenderRequest, RenderResult, TemplateTextRenderer, LanguageRouter } from "@storyforge/llm-client";
import { AdventureEventType } from "@storyforge/shared";

class CountingRenderer implements TextRenderer {

    calls = 0;

    async render(request: RenderRequest): Promise<RenderResult> {

        this.calls++;

        return { text: `[rendered] ${request.actorName} ${request.narrativeSeed}.`, rendererUsed: "counting-fake" };

    }

}

function makeService(): DeterministicExpansionService {

    return new DeterministicExpansionService(

        new CandidateEventGenerator(),

        new ConstraintEngine(),

        new EventScorer(),

        new MemoryRetrievalService(),

        new SemanticEventBuilder()

    );

}

function baseInput() {

    const worldState = createInitialWorldState({
        worldId: "world-1", childId: "child-1", location: "the Whispering Wood", moral: "honesty", domain: "ethics"
    });

    return {

        adventureId: "adventure-1",

        worldState,

        characters: [{ id: "fox", name: "Fenn", role: "guide", description: "" }],

        // Phase 2A: fox is pre-established as active so existing
        // target-selection tests in this file (written before
        // character-continuity gating existed) keep exercising the
        // same candidates as before.
        narrativeState: {

            location: "the Whispering Wood",

            activeCharacterIds: ["fox"],

            currentGoal: "figure out what's happening",

            currentProblem: "a mystery in the Whispering Wood",

            establishedFacts: [] as string[],

            unresolvedThreads: [] as string[],

            recentEventTypes: [] as AdventureEventType[]

        },

        actorName: "Ari",

        ageRange: "7-8",

        domain: "ethics",

        skillFocus: ["leadership"],

        recentEventTypes: [] as AdventureEventType[],

        recentEvents: [],

        // Chapter-lifecycle correction pass: existing tests in this
        // file were written for the old "every expansion produces
        // endings" behavior. Defaulting to false here preserves their
        // original intent (they were testing candidate/constraint/
        // scoring correctness, not ending eligibility) -- endingEligible
        // is exercised explicitly where that's actually the point (see
        // the new endingEligible-specific tests below).
        endingEligible: false,

        emotionGuidance: { shouldReduceDifficulty: false, shouldIncreaseEncouragement: false, promptNote: "" },

        turn: 3,

        nodeIdPrefix: "ch-test"

    };

}

async function main(): Promise<void> {

    const service = makeService();

    // =========================================================
    // Section 1: hard constraints must never be bypassed
    // =========================================================

    {

        const input = {

            ...baseInput(),

            recentEventTypes: ["helped_npc", "led_team", "solved_puzzle"] as AdventureEventType[]

        };

        const result = await service.expand(input);

        console.assert(
            result.nodes.every(node => node.eventType !== "solved_puzzle"),
            "Expected 'solved_puzzle' (on cooldown) to never appear in results -- hard constraint must not be bypassed"
        );

        console.assert(
            result.entryChoices.length === result.nodes.length,
            "Expected entryChoices and nodes to stay in lockstep regardless of count"
        );

    }

    {

        const allTypes: AdventureEventType[] = [
            "asked_questions", "shared_resources", "ignored_warning", "failed_puzzle",
            "retried", "explored", "observed", "helped_npc", "led_team", "solved_puzzle"
        ];

        const input = { ...baseInput(), recentEventTypes: allTypes };

        const result = await service.expand(input);

        console.assert(
            result.nodes.every(node =>
                !["helped_npc", "solved_puzzle", "led_team"].includes(node.eventType ?? "")
            ),
            "Expected cooldown-bearing types to never survive when their type was just used"
        );

    }

    // =========================================================
    // Section 2: NPC target/prerequisite consistency, multiple NPCs
    // =========================================================

    {

        const luna = { id: "luna", name: "Luna", role: "friend", description: "" };

        const aria = { id: "aria", name: "Aria", role: "mentor", description: "" };

        const candidates0 = new CandidateEventGenerator().generate({
            location: "forest", characters: [luna, aria], activeCharacterIds: [luna.id, aria.id], domain: "ethics", turnIndex: 0
        });

        const candidates1 = new CandidateEventGenerator().generate({
            location: "forest", characters: [luna, aria], activeCharacterIds: [luna.id, aria.id], domain: "ethics", turnIndex: 1
        });

        const helpLuna = candidates0.find(c => c.type === "helped_npc")!;

        const helpAria = candidates1.find(c => c.type === "helped_npc")!;

        console.assert(
            helpLuna.targetName === "Luna",
            `Expected turn 0's helped_npc to target Luna, got ${helpLuna.targetName}`
        );

        console.assert(
            helpAria.targetName === "Aria",
            `Expected turn 1's helped_npc to target Aria, got ${helpAria.targetName}`
        );

        console.assert(
            helpLuna.prerequisites.some(p => p.type === "npc_present" && p.key === "luna"),
            `Expected turn 0's prerequisites to reference 'luna' (the actual target), got ${JSON.stringify(helpLuna.prerequisites)}`
        );

        console.assert(
            helpAria.prerequisites.some(p => p.type === "npc_present" && p.key === "aria"),
            `Expected turn 1's prerequisites to reference 'aria' (the actual target), got ${JSON.stringify(helpAria.prerequisites)}`
        );

        console.assert(
            helpLuna.relationshipEffects[0]?.characterId === "luna" &&
            helpAria.relationshipEffects[0]?.characterId === "aria",
            "Expected relationshipEffects to reference the same target as prerequisites and targetId"
        );

        const noCharacters = new CandidateEventGenerator().generate({
            location: "forest", characters: [], activeCharacterIds: [], domain: "ethics", turnIndex: 0
        });

        const helpNoOne = noCharacters.find(c => c.type === "helped_npc")!;

        console.assert(
            helpNoOne.targetId === undefined && helpNoOne.prerequisites.length > 0,
            "Expected zero characters to be handled safely: no target, no crash, and a permanently-failing prerequisite (not simply empty, which would wrongly make it valid)"
        );

    }

    // =========================================================
    // Section 3: lazy narration -- structural expansion never
    // touches a renderer.
    // =========================================================

    {

        const result = await service.expand(baseInput());

        console.assert(
            result.nodes.length > 0,
            "Expected structural expansion to succeed and produce nodes"
        );

        console.assert(
            result.nodes.every(node => node.narrative === ""),
            "Expected every freshly-expanded node to have EMPTY narrative (not yet rendered)"
        );

        console.assert(
            result.nodes.every(node => node.pendingRenderRequest !== undefined),
            "Expected every freshly-expanded node to carry a pendingRenderRequest"
        );

        console.assert(
            result.nodes.every(node => node.effects !== undefined && node.emotion !== undefined),
            "Expected canonical state (effects, emotion) to exist independently of narration (Property F)"
        );

    }

    // =========================================================
    // Call-count test
    // =========================================================

    {

        const nodeRepo = new InMemoryStoryNodeRepository();

        const counting = new CountingRenderer();

        const router = new LanguageRouter(new TemplateTextRenderer(), counting);

        const narrationService = new NarrationRenderingService(router, nodeRepo);

        const result = await service.expand(baseInput());

        await nodeRepo.saveMany(result.nodes);

        console.assert(
            counting.calls === 0,
            `Expected 0 renderer calls immediately after structural expansion, got ${counting.calls}`
        );

        const richNodes = result.nodes.filter(node => node.pendingRenderRequest?.complexity === "rich");

        const trivialNodes = result.nodes.filter(node => node.pendingRenderRequest?.complexity === "trivial");

        console.assert(
            richNodes.length > 0 && trivialNodes.length > 0,
            "Expected this scenario to include at least one rich and one trivial candidate to test both paths"
        );

        const firstRich = await narrationService.ensureRendered(richNodes[0]);

        console.assert(counting.calls === 1, `Expected 1 Gemini call after visiting a rich node, got ${counting.calls}`);

        console.assert(firstRich.narrative.length > 0, "Expected the rich node to now have narrative");

        await narrationService.ensureRendered(firstRich);

        console.assert(counting.calls === 1, `Expected re-fetching an already-rendered node NOT to call the renderer again, got ${counting.calls}`);

        await narrationService.ensureRendered(trivialNodes[0]);

        console.assert(counting.calls === 1, `Expected a trivial node to use the template renderer, not Gemini, got ${counting.calls}`);

        if (richNodes.length > 1) {

            await narrationService.ensureRendered(richNodes[1]);

            console.assert(counting.calls === 2, `Expected a second distinct rich node to trigger a second Gemini call, got ${counting.calls}`);

        }

    }

    // =========================================================
    // Renderer failure -> safe fallback, canonical state intact
    // =========================================================

    {

        const nodeRepo = new InMemoryStoryNodeRepository();

        const failing: TextRenderer = { render: async () => { throw new Error("simulated Gemini outage"); } };

        const narrationService = new NarrationRenderingService(failing, nodeRepo);

        const result = await service.expand(baseInput());

        await nodeRepo.saveMany(result.nodes);

        const rich = result.nodes.find(node => node.pendingRenderRequest?.complexity === "rich") ?? result.nodes[0];

        const rendered = await narrationService.ensureRendered(rich);

        console.assert(
            rendered.narrative.length > 0,
            "Expected a safe fallback narrative even when the renderer throws"
        );

        console.assert(
            rendered.effects === rich.effects && rendered.emotion === rich.emotion,
            "Expected canonical state to remain untouched by a renderer failure"
        );

    }

    // =========================================================
    // Section 4: memory/continuity integration
    // =========================================================

    {

        const target = { id: "luna", name: "Luna", role: "friend", description: "" };

        const positiveMemory = {

            id: "mem-1", worldId: "w1", sessionId: "s1", childId: "c1", adventureId: "adventure-1",
            nodeId: "n1", eventType: "helped_npc" as const, narrative: "helped Luna before",
            characterId: "luna", characterName: "Luna",
            emotion: { excitement: 0, curiosity: 0, confidence: 0, fear: 0, wonder: 0, frustration: 0, pride: 0, calm: 0 },
            createdAt: new Date().toISOString()

        };

        const withMemory = { ...baseInput(), characters: [target], recentEvents: [positiveMemory] };

        const scorer = new EventScorer();

        const candidates = new CandidateEventGenerator().generate({
            location: "forest", characters: [target], activeCharacterIds: [target.id], domain: "ethics", turnIndex: 0
        });

        const memoryService = new MemoryRetrievalService();

        const relevantWithMemory = memoryService.retrieve(withMemory.recentEvents, { limit: 5 });

        const relevantWithout = memoryService.retrieve([], { limit: 5 });

        const ledTeamCandidate = candidates.find(c => c.type === "led_team")!;

        const scoredWith = scorer.score([ledTeamCandidate], {
            skillFocus: [], recentEventTypes: [], emotionGuidance: withMemory.emotionGuidance,
            relevantMemories: relevantWithMemory, seed: 1
        })[0];

        const scoredWithout = scorer.score([ledTeamCandidate], {
            skillFocus: [], recentEventTypes: [], emotionGuidance: withMemory.emotionGuidance,
            relevantMemories: relevantWithout, seed: 1
        })[0];

        console.assert(
            scoredWith.components.continuity > scoredWithout.components.continuity,
            `Expected a relevant positive memory about the SAME target to increase continuity (${scoredWith.components.continuity} vs ${scoredWithout.components.continuity})`
        );

        const irrelevantMemory = { ...positiveMemory, id: "mem-2", characterId: "someone-else" };

        const relevantIrrelevant = memoryService.retrieve([irrelevantMemory], { limit: 5 });

        const scoredIrrelevant = scorer.score([ledTeamCandidate], {
            skillFocus: [], recentEventTypes: [], emotionGuidance: withMemory.emotionGuidance,
            relevantMemories: relevantIrrelevant, seed: 1
        })[0];

        console.assert(
            scoredIrrelevant.components.continuity === scoredWithout.components.continuity,
            "Expected memory about an unrelated character not to affect continuity"
        );

        const stronglyRemembered = { ...withMemory, recentEventTypes: ["led_team"] as AdventureEventType[] };

        const resultWithStrongMemory = await service.expand(stronglyRemembered);

        console.assert(
            resultWithStrongMemory.nodes.every(node => node.eventType !== "led_team"),
            "Expected memory to NEVER resurrect a candidate that failed a hard constraint"
        );

        const resultA = await service.expand(withMemory);

        const resultB = await service.expand(withMemory);

        const stripCreatedAt = (r: typeof resultA) =>
            r.nodes.map(node => {
                const { createdAt, ...rest } = node;
                void createdAt;
                return rest;
            });

        console.assert(
            JSON.stringify(stripCreatedAt(resultA)) === JSON.stringify(stripCreatedAt(resultB)),
            "Expected identical state+seed+memory to produce identical selection"
        );

    }

    console.log("DeterministicExpansionService tests passed.");

}

main();
