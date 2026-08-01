import { StateEffect } from "@storyforge/simulation-engine";
import { AdventureEventType } from "@storyforge/shared";
import { RenderRequest } from "@storyforge/llm-client";
import { StoryChoice } from "./StoryChoice";
import { EmotionProfile } from "./EmotionProfile";

// A single vertex in the Story Graph. Gameplay is: render this
// node's narrative + choices, wait for the child to pick a
// StoryChoice, jump to that choice's nextNodeId -- pure traversal,
// no LLM call. Everything the old per-turn ConsequenceEngine used to
// decide on the fly is now authored once, up front, per node.
export interface StoryNode {

    id: string;

    adventureId: string;

    // Correction pass (Section 3, lazy narration): "" means this
    // node's STRUCTURE (effects/emotion/choices) is already decided
    // and persisted, but its PROSE has not been rendered yet --
    // see pendingRenderRequest. Nodes from the initial blueprint /
    // AdventureBlueprintGenerator.expandFrom() (untouched this pass)
    // always have narrative populated eagerly, same as before;
    // DeterministicExpansionService is the only producer of nodes
    // that start empty.
    narrative: string;

    // Present only while narrative is still "". Everything a
    // TextRenderer needs to eventually render this node, computed
    // once at structural-decision time and persisted so rendering
    // can happen later without re-deriving anything (Property F:
    // canonical event/state data exists independently of narration).
    pendingRenderRequest?: RenderRequest;

    choices: StoryChoice[];

    // Short value tags this node touches (same free-form vocabulary
    // as the old Consequence Engine's learningSignals), never shown
    // to the child.
    learningSignals: string[];

    emotion: EmotionProfile;

    // Deterministic state changes applied on arrival at this node.
    // Reuses simulation-engine's StateEffect (inventory.add/remove,
    // relationship.delta, quest.*, economy.delta, flag.set,
    // location.set) rather than three separate
    // inventory/relationship/quest arrays -- same information the
    // spec describes, expressed through the taxonomy the
    // DeterministicSimulator already validates and applies, so
    // nothing about how effects are checked or clamped needs to
    // change.
    effects: StateEffect[];

    // 1 (easiest) - 5 (hardest). Read by the Emotion Engine (a later
    // phase) to soften upcoming nodes when frustration is trending
    // high.
    difficulty: number;

    readingLevel: string;

    // v3: which Adventure Event (if any) arriving at this node
    // represents -- authored once at generation time, not inferred
    // per turn. This is what lets the Reflection/Analytics Engines
    // work from collected events instead of a fresh LLM call every
    // turn. Undefined means this node isn't a notable event (e.g.
    // ambient narrative beats between decision points).
    eventType?: AdventureEventType;

    // Correction pass (Section 2/4): the SAME character the
    // candidate event targeted, if any -- carried through so
    // AdventureRuntime can log an accurate AdventureEvent.characterId
    // without re-deriving/re-guessing which NPC was involved.
    targetCharacterId?: string;

    targetCharacterName?: string;

    // Phase 2A: the SemanticEvent's consequence/factEstablished
    // content, persisted on the node itself so
    // NarrativeStateTransition.apply() can update NarrativeState
    // deterministically WHEN this node is actually visited -- never
    // when it's merely generated as one of several unvisited
    // sibling choices (Section 9/10: unvisited branches must not
    // mutate played state).
    narrativeConsequence?: string;

    // Phase 2B (Section B): set ONLY when this event explicitly
    // introduces a character into the active scene -- the ONLY
    // signal NarrativeStateTransition uses to grow
    // activeCharacterIds. Distinct from targetCharacterId/Name
    // (which identifies who an event was directed at, and does NOT
    // by itself imply introduction).
    characterIntroducedId?: string;

    characterIntroducedName?: string;

    threadIntroduced?: string;

    threadResolved?: string;

    isEnding: boolean;

    // e.g. "triumphant", "bittersweet", "cliffhanger" -- only
    // meaningful when isEnding is true.
    endingType?: string;

    createdAt: string;

}
