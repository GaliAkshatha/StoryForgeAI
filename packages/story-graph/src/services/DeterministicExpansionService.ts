import { AdventureEventType } from "@storyforge/shared";
import { RenderRequest } from "@storyforge/llm-client";
import { WorldState, NarrativeState } from "@storyforge/simulation-engine";

import { CandidateEventGenerator } from "./CandidateEventGenerator";
import { ConstraintEngine, ConstraintContext } from "./ConstraintEngine";
import { EventScorer, ScoredCandidate } from "./EventScorer";
import { EmotionGuidance } from "./EmotionTrendService";
import { MemoryRetrievalService } from "./MemoryRetrievalService";
import { SemanticEventBuilder } from "./SemanticEventBuilder";
import { SeededRandom } from "./SeededRandom";
import { ChoiceCountPolicy } from "./ChoiceCountPolicy";
import { ChoiceTextBuilder } from "./ChoiceTextBuilder";

import { StoryNode } from "../models/StoryNode";
import { StoryChoice } from "../models/StoryChoice";
import { AdventureCharacter } from "../models/Adventure";
import { AdventureEvent } from "../models/AdventureEvent";
import { CandidateEvent } from "../models/CandidateEvent";
import { neutralEmotionProfile, EmotionProfile } from "../models/EmotionProfile";

// Section G correction pass: the hardcoded "always 4" is gone.
// ChoiceCountPolicy decides the target (2-3 normally), and this
// service never pads the result back up past however many
// candidates actually survived ConstraintEngine.

// Phase 2B: the fixed eventType-only CHOICE_TEXT map that used to
// live here is gone -- superseded by ChoiceTextBuilder, which
// contextualizes wording using target/problem/location and keeps
// this exact generic wording only as its last-resort fallback.

export interface DeterministicExpansionInput {

    adventureId: string;

    worldState: WorldState;

    characters: AdventureCharacter[];

    actorName: string;

    ageRange: string;

    aboutChild?: string;

    domain: string;

    skillFocus: string[];

    recentEventTypes: AdventureEventType[];

    // Correction pass (Section 4): the actual persisted event
    // history (not just types), so MemoryRetrievalService has
    // something to retrieve from for continuity scoring.
    recentEvents: AdventureEvent[];

    emotionGuidance: EmotionGuidance;

    turn: number;

    // Section D/I correction pass: whether ChapterProgressionEngine
    // has determined the chapter may genuinely conclude. When false,
    // produced nodes are FRONTIER (isEnding: false, not yet
    // expanded) -- not endings. When true, produced nodes are
    // genuine endings. This service never decides eligibility
    // itself; it only acts on what it's told.
    endingEligible: boolean;

    // Phase 2A: the currently-played story state -- read-only input
    // here. This service never mutates it; NarrativeStateTransition
    // (called from AdventureRuntime, only for the node the child
    // actually visits) is the only thing allowed to change it.
    narrativeState: NarrativeState;

    nodeIdPrefix: string;

}

export interface DeterministicExpansionResult {

    entryChoices: StoryChoice[];

    nodes: StoryNode[];

}

// Phases B-F, H, I (structure only -- see NarrationRenderingService
// for J-M, moved out by the correction pass) wired together: this is
// what AdventureRuntime.maybeExpandGraph() calls INSTEAD of
// AdventureBlueprintGenerator.expandFrom() for ongoing chapter
// expansion. The one-time initial blueprint (AdventureCompiler,
// called once per adventure) is deliberately left as an LLM call --
// see the final report for why that boundary was chosen.
//
// Correction pass: this service no longer calls any TextRenderer.
// It persists STRUCTURE only (effects, emotion, choices) plus a
// pendingRenderRequest per node -- narration happens lazily, only
// for whichever node the child actually reaches (see
// NarrationRenderingService, invoked from AdventureRuntime.playTurn).
export class DeterministicExpansionService {

    constructor(
        private readonly candidateGenerator: CandidateEventGenerator,
        private readonly constraintEngine: ConstraintEngine,
        private readonly eventScorer: EventScorer,
        private readonly memoryRetrievalService: MemoryRetrievalService,
        private readonly semanticEventBuilder: SemanticEventBuilder,
        private readonly choiceCountPolicy: ChoiceCountPolicy = new ChoiceCountPolicy(),
        private readonly choiceTextBuilder: ChoiceTextBuilder = new ChoiceTextBuilder()
    ) {}

    async expand(
        input: DeterministicExpansionInput
    ): Promise<DeterministicExpansionResult> {

        const candidates = this.candidateGenerator.generate({

            location: input.worldState.location,

            characters: input.characters,

            activeCharacterIds: input.narrativeState.activeCharacterIds,

            domain: input.domain,

            turnIndex: input.turn

        });

        const constraintContext: ConstraintContext = {

            worldState: input.worldState,

            recentEventTypes: input.recentEventTypes,

            // Phase 2A fix (Section 7A): this used to be EVERY
            // adventure character, which let a candidate target a
            // character never actually established in the story.
            // Now sourced from NarrativeState -- only characters
            // already active in the played scene are selectable.
            presentCharacterIds: input.narrativeState.activeCharacterIds,

            narrativeState: input.narrativeState

        };

        // Section 1: hard constraint filtering is the ONLY gate.
        // Whatever survives here is what's eligible -- never padded
        // back up with candidates that failed a prerequisite.
        const valid = this.constraintEngine.filter(candidates, constraintContext);

        if (valid.length === 0) {

            // Nothing can legally happen next. Rather than violate a
            // hard constraint to force a choice to exist, this
            // expansion is a safe no-op -- AdventureRuntime treats
            // an empty result as "nothing to graft this turn" and
            // leaves the current node exactly as it was (same
            // handling as when the graph isn't running low yet).
            console.log(

                "\n===== DeterministicExpansionService: no valid candidates =====\n" +
                `${candidates.length} candidates generated, 0 passed hard constraints. ` +
                "Expansion skipped this turn rather than resurrecting an invalid candidate.\n" +
                "================================================================\n"

            );

            return { entryChoices: [], nodes: [] };

        }

        // Section 4: memory enrichment happens AFTER hard constraints,
        // BEFORE scoring -- it can influence which VALID candidate
        // wins, never which candidates are eligible to begin with.
        const relevantMemories = this.memoryRetrievalService.retrieve(
            input.recentEvents,
            { limit: 5, relevantTags: valid.map(candidate => candidate.type) }
        );

        const seed = SeededRandom.seedFromString(`${input.adventureId}:${input.turn}`);

        const ranked = this.eventScorer.score(

            valid,

            {

                skillFocus: input.skillFocus,

                recentEventTypes: input.recentEventTypes,

                emotionGuidance: input.emotionGuidance,

                relevantMemories,

                seed

            }

        );

        const targetCount = this.choiceCountPolicy.determine(valid.length);

        // Section H: small deterministic diversity rule -- walk the
        // ranked list greedily, but skip a candidate whose type has
        // already been selected this round, so 2-3 choices don't end
        // up as near-duplicates that only differ by a random
        // tie-break. Falls back to allowing a repeat type only if
        // there genuinely aren't enough distinct types to reach
        // targetCount (never invents a candidate to avoid this).
        const scored: ScoredCandidate[] = [];

        const usedTypes = new Set<string>();

        for (const entry of ranked) {

            if (scored.length >= targetCount) {
                break;
            }

            if (usedTypes.has(entry.event.type)) {
                continue;
            }

            scored.push(entry);

            usedTypes.add(entry.event.type);

        }

        for (const entry of ranked) {

            if (scored.length >= targetCount) {
                break;
            }

            if (!scored.includes(entry)) {

                scored.push(entry);

            }

        }

        this.logScoring(scored);

        const entryChoices: StoryChoice[] = [];

        const nodes: StoryNode[] = [];

        for (let i = 0; i < scored.length; i++) {

            const candidate = scored[i].event;

            const nodeId = `${input.nodeIdPrefix}-${i}`;

            const semanticEvent = this.semanticEventBuilder.build({

                candidate,

                actorName: input.actorName,

                ageRange: input.ageRange,

                aboutChild: input.aboutChild,

                narrativeState: input.narrativeState

            });

            const pendingRenderRequest: RenderRequest = {

                ageRange: semanticEvent.audience.ageRange,

                tone: semanticEvent.style.tone,

                maxSentences: semanticEvent.style.maxSentences,

                location: semanticEvent.scene.location,

                actorName: semanticEvent.actor.name,

                targetName: semanticEvent.target?.name,

                eventType: semanticEvent.event.type,

                narrativeSeed: semanticEvent.event.narrativeSeed,

                skill: semanticEvent.learning?.skill,

                personalizationHint: semanticEvent.personalizationHint,

                complexity: candidate.complexity

            };

            nodes.push({

                id: nodeId,

                adventureId: input.adventureId,

                // Section 3: NOT rendered here. Empty narrative +
                // pendingRenderRequest is the "structure decided,
                // language not generated yet" state.
                narrative: "",

                pendingRenderRequest,

                choices: [],

                learningSignals: candidate.learningTags,

                emotion: this.mergeEmotion(candidate.emotionalEffects),

                effects: candidate.effects,

                difficulty: candidate.complexity === "rich" ? 3 : 1,

                readingLevel: input.ageRange,

                isEnding: input.endingEligible,

                endingType: input.endingEligible ? candidate.type : undefined,

                eventType: candidate.type,

                targetCharacterId: candidate.targetId,

                targetCharacterName: candidate.targetName,

                // Phase 2A: carried through so AdventureRuntime can
                // apply NarrativeStateTransition deterministically
                // WHEN this node is visited, without recomputing
                // anything or touching unvisited siblings.
                narrativeConsequence: semanticEvent.factEstablished ?? semanticEvent.consequence,

                characterIntroducedId: semanticEvent.characterIntroduced?.id,

                characterIntroducedName: semanticEvent.characterIntroduced?.name,

                threadIntroduced: semanticEvent.threadIntroduced,

                threadResolved: semanticEvent.threadResolved,

                createdAt: new Date().toISOString()

            });

            entryChoices.push({

                id: `${input.nodeIdPrefix}-choice-${i}`,

                text: this.choiceTextBuilder.build(candidate, input.narrativeState),

                nextNodeId: nodeId

            });

        }

        return { entryChoices, nodes };

    }

    private mergeEmotion(
        deltas: CandidateEvent["emotionalEffects"]
    ): EmotionProfile {

        const base = neutralEmotionProfile();

        const merged: EmotionProfile = { ...base };

        for (const key of Object.keys(base) as (keyof EmotionProfile)[]) {

            const delta = deltas[key] ?? 0;

            merged[key] = Math.max(0, Math.min(1, base[key] + delta));

        }

        return merged;

    }

    private logScoring(
        scored: ScoredCandidate[]
    ): void {

        console.log(

            "\n===== EVENT SCORING (Phase D, Section 4 continuity added) =====\n" +
            scored.map((entry, index) =>
                `#${index + 1} ${entry.event.type} -- total=${entry.totalScore.toFixed(3)} ` +
                `[learning=${entry.components.learningRelevance.toFixed(2)} ` +
                `novelty=${entry.components.novelty.toFixed(2)} ` +
                `emotional=${entry.components.emotionalRelevance.toFixed(2)} ` +
                `difficulty=${entry.components.difficultyMatch.toFixed(2)} ` +
                `continuity=${entry.components.continuity.toFixed(2)} ` +
                `repetitionPenalty=${entry.components.repetitionPenalty.toFixed(2)} ` +
                `random=${entry.components.randomness.toFixed(2)}]`
            ).join("\n") +
            "\n====================================\n"

        );

    }

}
