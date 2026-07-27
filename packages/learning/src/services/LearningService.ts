import { LearningAnalytics } from "@storyforge/shared";

import {
    WeeklyReport,
    WeeklyTrendPoint,
    SkillGrowthPoint,
    LearningRecommendation
} from "../models/WeeklyReport";

import { LearningRepository } from "../repositories/LearningRepository";

// A skill with an average delta below this threshold (but at least
// one observation) surfaces as a growth opportunity. This is a
// simple, transparent rule -- not a scored judgment about the child.
const GROWTH_OPPORTUNITY_THRESHOLD = 0.3;

export class LearningService {

    constructor(
        private readonly repository: LearningRepository
    ) {}

    async recordSession(
        analytics: LearningAnalytics
    ): Promise<void> {

        await this.repository.save(analytics);

    }

    async getSkillGrowth(
        childId: string,
        range?: { start: Date; end: Date }
    ): Promise<SkillGrowthPoint[]> {

        const records = await this.repository.findByChildId(
            childId,
            range
        );

        return this.aggregateSkillGrowth(records);

    }

    // Weekly-bucketed skill growth over the last `weeksBack` weeks
    // (default 8), oldest first -- what the Parent Dashboard's trend
    // chart and the AI summary are both built from. Each bucket is
    // computed with the same deterministic aggregateSkillGrowth used
    // by generateWeeklyReport, just repeated per week.
    async getWeeklyTrend(
        childId: string,
        weeksBack = 8
    ): Promise<WeeklyTrendPoint[]> {

        const now = new Date();

        const weeks: WeeklyTrendPoint[] = [];

        for (let i = weeksBack - 1; i >= 0; i--) {

            const weekEnd = new Date(
                now.getTime() - i * 7 * 24 * 60 * 60 * 1000
            );

            const weekStart = new Date(
                weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000
            );

            const records = await this.repository.findByChildId(
                childId,
                { start: weekStart, end: weekEnd }
            );

            weeks.push({

                weekStart: weekStart.toISOString(),

                weekEnd: weekEnd.toISOString(),

                sessionsPlayed: records.length,

                skillGrowth: this.aggregateSkillGrowth(records)

            });

        }

        return weeks;

    }

    async generateWeeklyReport(
        childId: string,
        weekStart: Date,
        weekEnd: Date
    ): Promise<WeeklyReport> {

        const records = await this.repository.findByChildId(
            childId,
            { start: weekStart, end: weekEnd }
        );

        const skillGrowth = this.aggregateSkillGrowth(records);

        const behaviorHighlights = records

            .flatMap(record => record.behaviorNotes)

            .slice(0, 10);

        const recommendations = this.deriveRecommendations(skillGrowth);

        const summary = records.length > 0
            ? `Played ${records.length} adventure session${records.length === 1 ? "" : "s"} this week, ` +
              `with observable signals across ${skillGrowth.length} skill area${skillGrowth.length === 1 ? "" : "s"}.`
            : "No adventures played this week.";

        return {

            childId,

            weekStart: weekStart.toISOString(),

            weekEnd: weekEnd.toISOString(),

            sessionsPlayed: records.length,

            skillGrowth,

            behaviorHighlights,

            recommendations,

            summary

        };

    }

    private aggregateSkillGrowth(
        records: LearningAnalytics[]
    ): SkillGrowthPoint[] {

        const bySkill = new Map<string, { total: number; count: number }>();

        for (const record of records) {

            for (const signal of record.skillSignals) {

                const entry = bySkill.get(signal.skill) ?? {
                    total: 0,
                    count: 0
                };

                entry.total += signal.delta;

                entry.count += 1;

                bySkill.set(signal.skill, entry);

            }

        }

        return [...bySkill.entries()]

            .map(([skill, entry]) => ({

                skill,

                averageDelta: entry.total / entry.count,

                observationCount: entry.count

            }))

            .sort((a, b) => b.observationCount - a.observationCount);

    }

    private deriveRecommendations(
        skillGrowth: SkillGrowthPoint[]
    ): LearningRecommendation[] {

        return skillGrowth

            .filter(point => point.averageDelta < GROWTH_OPPORTUNITY_THRESHOLD)

            .sort((a, b) => a.averageDelta - b.averageDelta)

            .slice(0, 3)

            .map(point => ({

                title: `More opportunities to practice ${point.skill}`,

                description:
                    `Across ${point.observationCount} observed moment${point.observationCount === 1 ? "" : "s"}, ` +
                    `adventures touching "${point.skill}" showed a modest signal (${point.averageDelta.toFixed(2)}). ` +
                    `A future adventure themed around this could give more chances to practice it.`,

                basedOnSkill: point.skill

            }));

    }

}
