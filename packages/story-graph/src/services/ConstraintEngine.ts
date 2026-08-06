import { WorldState, RelationshipStatus, NarrativeState } from "@storyforge/simulation-engine";
import { CandidateEvent, EventPrerequisite } from "../models/CandidateEvent";
import { AdventureEventType } from "@storyforge/shared";

export interface ConstraintContext {

    worldState: WorldState;

    recentEventTypes: AdventureEventType[];

    presentCharacterIds: string[];

    // Phase 2A: "is this kind of event possible given the current
    // story state" now includes narrative preconditions
    // (problem_established), not just mechanical ones (flags/items).
    narrativeState: NarrativeState;

}

export interface ConstraintCheckResult {

    valid: boolean;

    reasons: string[];

}

// Phase C: pure, deterministic, side-effect-free filtering. Every
// function here is a straightforward `valid(event, context) ->
// boolean` -- no LLM, no I/O, trivially unit-testable.
export class ConstraintEngine {

    check(
        event: CandidateEvent,
        context: ConstraintContext
    ): ConstraintCheckResult {

        const reasons: string[] = [];

        for (const prerequisite of event.prerequisites) {

            const failure = this.checkOne(prerequisite, context);

            if (failure) {
                reasons.push(failure);
            }

        }

        return { valid: reasons.length === 0, reasons };

    }

    filter(
        events: CandidateEvent[],
        context: ConstraintContext
    ): CandidateEvent[] {

        return events.filter(event => this.check(event, context).valid);

    }

    private checkOne(
        prerequisite: EventPrerequisite,
        context: ConstraintContext
    ): string | undefined {

        switch (prerequisite.type) {

            case "flag_true":
                return context.worldState.flags[prerequisite.key] === true
                    ? undefined
                    : `flag '${prerequisite.key}' is not true`;

            case "flag_false":
                return context.worldState.flags[prerequisite.key] !== true
                    ? undefined
                    : `flag '${prerequisite.key}' is true`;

            case "has_item":
                return context.worldState.inventory.some(
                    item => item.id === prerequisite.key && item.quantity > 0
                )
                    ? undefined
                    : `missing required item '${prerequisite.key}'`;

            case "npc_present":
                if (!prerequisite.key) {
                    return undefined;
                }
                return context.presentCharacterIds.includes(prerequisite.key)
                    ? undefined
                    : `NPC '${prerequisite.key}' is not present`;

            case "relationship_trust_at_least": {

                const relationship = context.worldState.relationships.find(
                    (r: RelationshipStatus) => r.characterId === prerequisite.key
                );

                const trust = relationship?.trust ?? 0;

                return trust >= (prerequisite.threshold ?? 0)
                    ? undefined
                    : `trust with '${prerequisite.key}' (${trust}) below threshold (${prerequisite.threshold})`;

            }

            case "not_recently_used": {

                const cooldown = prerequisite.cooldownTurns ?? 1;

                const recent = context.recentEventTypes.slice(-cooldown);

                return recent.includes(prerequisite.key as AdventureEventType)
                    ? `event type '${prerequisite.key}' used within the last ${cooldown} turn(s)`
                    : undefined;

            }

            // Section 7C/E: helped_npc/solved_puzzle/failed_puzzle
            // require a concrete established obstacle -- otherwise
            // "helps X" or "solves it" refers to nothing.
            case "problem_established":

                if (context.narrativeState.activeProblem) {

                    return context.narrativeState.activeProblem.status === "active"
                        ? undefined
                        : "the established problem has already been resolved";

                }

                return context.narrativeState.currentProblem
                    ? undefined
                    : "no problem is currently established in the story";

            default:
                return undefined;

        }

    }

}
