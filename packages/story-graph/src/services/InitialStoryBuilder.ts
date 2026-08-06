import { RenderRequest } from "@storyforge/llm-client";
import { WorldState, NarrativeState, StoryProblem, PlotBeat } from "@storyforge/simulation-engine";

import { DeterministicExpansionService } from "./DeterministicExpansionService";
import { EmotionGuidance } from "./EmotionTrendService";

import { StoryNode } from "../models/StoryNode";
import { AdventureCharacter } from "../models/Adventure";
import { neutralEmotionProfile } from "../models/EmotionProfile";

export interface InitialStoryInput {

    adventureId: string;

    worldState: WorldState;

    characters: AdventureCharacter[];

    actorName: string;

    ageRange: string;

    aboutChild?: string;

    domain: string;

    skillFocus: string[];

    location: string;

    premise: string;

    // Stabilization pass: distinct from premise -- see Adventure.initialProblem.
    initialProblem: string;

    plotOutline: PlotBeat[];

}

export interface InitialStoryResult {

    rootNode: StoryNode;

    nodes: StoryNode[];

    // Phase 2A: the seeded persistent story state -- derived here
    // (not by a Gemini call) since this class already receives every
    // input needed (premise/characters/location/skillFocus).
    // AdventureRuntime.startAdventure() persists this onto the real
    // WorldState.
    narrativeState: NarrativeState;

}

const ROOT_NODE_ID = "root";

// Correction pass (Sections 2, 3, 6): builds ONLY the minimum graph
// structure needed to start valid gameplay -- root + up to 4
// frontier nodes -- by composing the SAME deterministic pipeline
// (CandidateEventGenerator -> ConstraintEngine -> EventScorer) that
// DeterministicExpansionService already uses for ongoing expansion.
export class InitialStoryBuilder {

    constructor(
        private readonly deterministicExpansionService: DeterministicExpansionService
    ) {}

    async build(
        input: InitialStoryInput
    ): Promise<InitialStoryResult> {

        const narrativeState = this.seedNarrativeState(input);

        const emotionGuidance: EmotionGuidance = {

            shouldReduceDifficulty: false,

            shouldIncreaseEncouragement: false,

            promptNote: "No emotional history yet -- this is the opening of the adventure."

        };

        const expansion = await this.deterministicExpansionService.expand({

            adventureId: input.adventureId,

            worldState: input.worldState,

            characters: input.characters,

            actorName: input.actorName,

            ageRange: input.ageRange,

            aboutChild: input.aboutChild,

            domain: input.domain,

            skillFocus: input.skillFocus,

            recentEventTypes: [],

            recentEvents: [],

            emotionGuidance,

            turn: 0,

            endingEligible: false,

            offerChoice: true,

            narrativeState,

            nodeIdPrefix: "frontier"

        });

        const rootRenderRequest: RenderRequest = {

            ageRange: input.ageRange,

            tone: "fantasy_adventure",

            maxSentences: 3,

            location: input.location,

            actorName: input.actorName,

            // Real browser bug: this was missing entirely, so the
            // renderer had no structured signal for who else is in
            // the opening scene -- it would either paraphrase the
            // premise's own wording (which doesn't always include
            // the name) or invent a generic description like "a
            // small squirrel," while the choices below (built
            // deterministically from narrativeState) correctly said
            // "Pip." Passing the same name here keeps them in sync.
            targetName: input.characters[0]?.name,

            eventType: "adventure_opening",

            narrativeSeed: input.premise,

            personalizationHint: input.aboutChild,

            complexity: "rich"

        };

        const rootNode: StoryNode = {

            id: ROOT_NODE_ID,

            adventureId: input.adventureId,

            narrative: "",

            pendingRenderRequest: rootRenderRequest,

            choices: expansion.entryChoices,

            learningSignals: [],

            emotion: neutralEmotionProfile(),

            effects: [],

            difficulty: 1,

            readingLevel: input.ageRange,

            isEnding: false,

            createdAt: new Date().toISOString()

        };

        return { rootNode, nodes: expansion.nodes, narrativeState };

    }

    // Phase 2A (Section 4): derived conservatively from already-
    // available metadata -- no new Gemini call, no fabricated
    // precision. If metadata genuinely doesn't support a field
    // (e.g. no characters at all), that field stays empty/undefined
    // rather than inventing content.
    // Hotfix: prompt wording alone ("must NEVER restate a character's
    // name+description") is not reliable enough -- the model still
    // sometimes returns a verbose character-bio sentence for
    // initialProblem. This deterministically enforces the constraint
    // regardless of what Gemini actually returned: strips "named
    // {character}" patterns, then caps to a short phrase.
    private sanitizeProblem(
        problem: string,
        characters: AdventureCharacter[]
    ): string {

        let cleaned = problem;

        for (const character of characters) {

            cleaned = cleaned.replace(
                new RegExp(`\\b(a|an|the)?\\s*[\\w\\s]*named ${character.name}\\b`, "i"),
                character.name
            );

        }

        const words = cleaned.trim().split(/\s+/);

        return words.length <= 6 ? cleaned.trim() : words.slice(0, 6).join(" ");

    }

    private seedNarrativeState(
        input: InitialStoryInput
    ): NarrativeState {

        const activeCharacterIds = input.characters[0] ? [input.characters[0].id] : [];

        const currentGoal = input.skillFocus[0]
            ? `find a way through what's happening, learning something about ${input.skillFocus[0]} along the way`
            : "find a way through what's happening";

        // Real fix (Utility AI architecture pass): a structured
        // StoryProblem replaces the old approach of sanitizing raw
        // strings after the fact. `reason` is still derived from
        // Gemini's initialProblem text, but it now lives in ONE
        // controlled field rather than being interpolated directly
        // into player-facing sentences -- ChoiceTextBuilder/
        // SemanticEventBuilder read this structured object, never
        // raw premise/description text.
        const activeProblem: StoryProblem = {

            id: `problem-${input.adventureId}-0`,

            type: "initial",

            participants: activeCharacterIds,

            reason: this.sanitizeProblem(input.initialProblem, input.characters),

            goal: "find a solution together",

            location: input.location,

            status: "active",

            difficulty: 1

        };

        return {

            location: input.location,

            // Conservative: only the FIRST character is established
            // at the opening -- not "every character in the
            // adventure's metadata is somehow already present."
            activeCharacterIds,

            // Derived from the existing learningPlan field (already
            // generated by AdventureMetadataGenerator) rather than
            // inventing a new one.
            currentGoal,

            activeProblem,

            // Backward-compatible derived string -- display/logging
            // only, never the source choice/narration text is built
            // from anymore.
            currentProblem: activeProblem.reason,

            establishedFacts: [input.premise],

            unresolvedThreads: [],

            plotOutline: input.plotOutline,

            currentBeatIndex: 0,

            recentEventTypes: []

        };

    }

}
