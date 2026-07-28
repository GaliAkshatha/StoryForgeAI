import { AdventureEventType, SkillSignal } from "@storyforge/shared";
import { EVENT_TRAIT_WEIGHTS } from "../models/eventTraitWeights";

// Part 4's "Replace AI analytics with deterministic analytics...
// Generate scores mathematically." This class never calls an LLM --
// it sums EVENT_TRAIT_WEIGHTS across whatever events actually
// happened and averages per trait. The output is still a
// SkillSignal[], the exact shape the Learning domain (WeeklyReport,
// getWeeklyTrend, the dashboard) already consumes, so nothing
// downstream of this needed to change.
export class DeterministicAnalyticsEngine {

    score(
        eventTypes: AdventureEventType[]
    ): SkillSignal[] {

        const totals = new Map<string, { sum: number; count: number; events: Set<AdventureEventType> }>();

        for (const eventType of eventTypes) {

            const weights = EVENT_TRAIT_WEIGHTS[eventType];

            for (const [trait, weight] of Object.entries(weights)) {

                const entry = totals.get(trait) ?? {
                    sum: 0,
                    count: 0,
                    events: new Set<AdventureEventType>()
                };

                entry.sum += weight as number;

                entry.count += 1;

                entry.events.add(eventType);

                totals.set(trait, entry);

            }

        }

        return [...totals.entries()]

            .map(([trait, entry]) => ({

                skill: trait,

                observation: this.describeObservation(entry.events, entry.count),

                delta: this.clamp(entry.sum / entry.count, -1, 1)

            }))

            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    }

    private describeObservation(
        events: Set<AdventureEventType>,
        count: number
    ): string {

        const readable = [...events]
            .map(event => event.replace(/_/g, " "))
            .join(", ");

        return `Observed ${count} moment${count === 1 ? "" : "s"} involving: ${readable}.`;

    }

    private clamp(value: number, min: number, max: number): number {

        return Math.min(max, Math.max(min, value));

    }

}
