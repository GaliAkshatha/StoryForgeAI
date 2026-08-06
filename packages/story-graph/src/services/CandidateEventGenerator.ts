import { AdventureEventType, ADVENTURE_EVENT_TYPES } from "@storyforge/shared";
import { CandidateEvent, EventPrerequisite } from "../models/CandidateEvent";
import { AdventureCharacter } from "../models/Adventure";

export interface CandidateGenerationContext {

    location: string;

    characters: AdventureCharacter[];

    // Phase 2A (Section 7A, character continuity): target selection
    // is now restricted to THIS list, not `characters` (every
    // character in the adventure's metadata). A character not yet
    // established in the story cannot become a candidate's target.
    activeCharacterIds: string[];

    domain: string;

    turnIndex: number;

}

interface FlagEffect {

    key: string;

    value: boolean;

}

interface EventTemplate {

    type: AdventureEventType;

    complexity: "trivial" | "rich";

    learningTags: string[];

    emotionalEffects: CandidateEvent["emotionalEffects"];

    needsTarget: boolean;

    prerequisites: (ctx: CandidateGenerationContext, target: AdventureCharacter | undefined) => EventPrerequisite[];

    narrativeSeed: (targetName: string | undefined, location: string) => string;

    relationshipDelta?: { trustDelta?: number; affinityDelta?: number };

    // Phase 2A: deterministic continuity bookkeeping -- e.g.
    // failed_puzzle establishes "there's something to retry",
    // explored establishes "there's something to be cautious about".
    // These are the SAME flag_true/flag_false prerequisite mechanism
    // ConstraintEngine already had; no new mechanism was invented.
    flagEffects?: FlagEffect[];

}

const TEMPLATES: EventTemplate[] = [

    {
        type: "helped_npc",
        complexity: "rich",
        learningTags: ["empathy"],
        emotionalEffects: { pride: 0.3, calm: 0.2 },
        needsTarget: true,
        // Section 7C/E: requires an established problem -- "helps X"
        // must refer to an actual obstacle, not an empty gesture.
        prerequisites: (_ctx, target) => target ? [
            { type: "npc_present", key: target.id },
            { type: "not_recently_used", key: "helped_npc", cooldownTurns: 3 },
            { type: "problem_established", key: "" }
        ] : [{ type: "npc_present", key: "__no_active_character__" }],
        narrativeSeed: target => `helps ${target ?? "someone nearby"} with something they're struggling with`,
        relationshipDelta: { trustDelta: 15, affinityDelta: 10 }
    },

    {
        type: "ignored_warning",
        complexity: "trivial",
        learningTags: ["risk-assessment"],
        emotionalEffects: { fear: 0.15, excitement: 0.1 },
        needsTarget: false,
        // Section 7D: no warning to ignore unless one was established
        // (see `explored`'s flagEffects below).
        prerequisites: () => [{ type: "flag_true", key: "warningEstablished" }],
        narrativeSeed: () => "presses on despite a clear warning sign",
        flagEffects: [{ key: "warningEstablished", value: false }]
    },

    {
        type: "solved_puzzle",
        complexity: "rich",
        learningTags: ["problem_solving"],
        emotionalEffects: { pride: 0.4, confidence: 0.3 },
        needsTarget: false,
        prerequisites: () => [
            { type: "not_recently_used", key: "solved_puzzle", cooldownTurns: 2 },
            { type: "problem_established", key: "" }
        ],
        narrativeSeed: (_target, location) => `figures out how to get past what's blocking the way at ${location}`
    },

    {
        type: "asked_questions",
        complexity: "trivial",
        learningTags: ["curiosity"],
        emotionalEffects: { curiosity: 0.3 },
        needsTarget: true,
        prerequisites: (_ctx, target) => target
            ? [{ type: "npc_present", key: target.id }]
            : [{ type: "npc_present", key: "__no_active_character__" }],
        narrativeSeed: target => `asks ${target ?? "someone nearby"} thoughtful questions about the situation`
    },

    {
        type: "shared_resources",
        complexity: "trivial",
        learningTags: ["collaboration"],
        emotionalEffects: { calm: 0.2, pride: 0.1 },
        needsTarget: true,
        prerequisites: (_ctx, target) => target
            ? [{ type: "npc_present", key: target.id }]
            : [{ type: "npc_present", key: "__no_active_character__" }],
        narrativeSeed: target => `shares something useful with ${target ?? "someone nearby"}`,
        relationshipDelta: { trustDelta: 8, affinityDelta: 12 }
    },

    {
        type: "led_team",
        complexity: "rich",
        learningTags: ["leadership"],
        emotionalEffects: { pride: 0.35, confidence: 0.4 },
        needsTarget: true,
        prerequisites: (_ctx, target) => target ? [
            { type: "npc_present", key: target.id },
            { type: "not_recently_used", key: "led_team", cooldownTurns: 3 }
        ] : [{ type: "npc_present", key: "__no_active_character__" }],
        narrativeSeed: target => `takes charge and leads ${target ?? "the group"} through a tricky moment`,
        relationshipDelta: { trustDelta: 10 }
    },

    {
        type: "failed_puzzle",
        complexity: "trivial",
        learningTags: ["persistence"],
        emotionalEffects: { frustration: 0.35 },
        needsTarget: false,
        prerequisites: () => [{ type: "problem_established", key: "" }],
        narrativeSeed: () => "tries to solve it but doesn't quite get it right this time",
        // Establishes the retry opportunity (Section 7B).
        flagEffects: [{ key: "hasFailedAttempt", value: true }]
    },

    {
        type: "retried",
        complexity: "trivial",
        learningTags: ["persistence"],
        emotionalEffects: { frustration: -0.2, confidence: 0.2 },
        needsTarget: false,
        // Section 7B: no retry without a prior established failure.
        prerequisites: () => [{ type: "flag_true", key: "hasFailedAttempt" }],
        narrativeSeed: () => "takes a breath and tries again",
        flagEffects: [{ key: "hasFailedAttempt", value: false }]
    },

    {
        type: "explored",
        complexity: "trivial",
        learningTags: ["curiosity"],
        emotionalEffects: { curiosity: 0.4, wonder: 0.3 },
        needsTarget: false,
        prerequisites: () => [],
        narrativeSeed: (_target, location) => `explores a new part of ${location}`,
        // Establishes something worth being cautious about (Section 7D).
        flagEffects: [{ key: "warningEstablished", value: true }]
    },

    {
        type: "observed",
        complexity: "trivial",
        learningTags: ["observation"],
        emotionalEffects: { calm: 0.3, curiosity: 0.2 },
        needsTarget: false,
        prerequisites: () => [],
        narrativeSeed: (_target, location) => `pays close attention to the details around ${location}`
    }

];

// Phase B: given the current adventure context, deterministically
// produce one candidate per known AdventureEventType. Same context
// in -> same candidates out, always -- no LLM, no randomness here
// (randomness, when used, lives only in EventScorer's tie-breaking).
export class CandidateEventGenerator {

    generate(
        context: CandidateGenerationContext
    ): CandidateEvent[] {

        return TEMPLATES

            .filter(template => ADVENTURE_EVENT_TYPES.includes(template.type))

            .map(template => this.buildCandidate(template, context));

    }

    private buildCandidate(
        template: EventTemplate,
        context: CandidateGenerationContext
    ): CandidateEvent {

        // Phase 2A: only characters ALREADY ESTABLISHED (active) are
        // eligible targets -- resolved ONCE, and everything
        // target-specific below derives from this same value.
        const activeCharacters = context.characters.filter(
            character => context.activeCharacterIds.includes(character.id)
        );

        const target = (template.needsTarget && activeCharacters.length > 0)
            ? activeCharacters[context.turnIndex % activeCharacters.length]
            : undefined;

        const relationshipEffects = (template.relationshipDelta && target) ? [{

            characterId: target.id,

            characterName: target.name,

            trustDelta: template.relationshipDelta.trustDelta,

            affinityDelta: template.relationshipDelta.affinityDelta

        }] : [];

        const flagEffectEntries = (template.flagEffects ?? []).map(flag => ({

            type: "flag.set" as const,

            payload: { key: flag.key, value: flag.value }

        }));

        return {

            id: `${template.type}-${context.turnIndex}`,

            type: template.type,

            actorId: "child",

            targetId: target?.id,

            targetName: target?.name,

            targetRole: target?.role,

            locationId: context.location,

            prerequisites: template.prerequisites(context, target),

            effects: [

                ...relationshipEffects.map(effect => ({

                    type: "relationship.delta" as const,

                    payload: effect

                })),

                ...flagEffectEntries

            ],

            learningTags: template.learningTags,

            emotionalEffects: template.emotionalEffects,

            relationshipEffects,

            narrativeSeed: template.narrativeSeed(target?.name, context.location),

            complexity: template.complexity,

            isEnding: true

        };

    }

}
