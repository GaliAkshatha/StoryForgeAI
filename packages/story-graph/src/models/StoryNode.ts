import { StateEffect } from "@storyforge/simulation-engine";
import { AdventureEventType } from "@storyforge/shared";
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

    narrative: string;

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

    isEnding: boolean;

    // e.g. "triumphant", "bittersweet", "cliffhanger" -- only
    // meaningful when isEnding is true.
    endingType?: string;

    createdAt: string;

}
