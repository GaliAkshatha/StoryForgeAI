import { JsonParser } from "@storyforge/llm-client";

import { LearningSummary } from "../models/LearningSummary";
import { SkillGrowthPoint, WeeklyTrendPoint } from "../models/WeeklyReport";
import { AIServices } from "./AIServices";

export interface SummarizeInput {

    childName: string;

    // Oldest-first, as returned by LearningService.getWeeklyTrend.
    weeklyTrend: WeeklyTrendPoint[];

}

const RECENT_WEEKS = 4;

// Turns the deterministic weekly trend into the parent-facing
// narrative the Master Prompt describes: "Your child consistently
// chooses to help others. This month empathy increased..." The LLM
// only ever narrates numbers it's given here -- it never sees raw
// session transcripts, so there's no path for it to invent or
// diagnose beyond what the aggregated data supports.
export class LearningSummaryService {

    constructor(
        private readonly ai: AIServices
    ) {}

    async summarize(
        input: SummarizeInput
    ): Promise<LearningSummary> {

        const recentWeeks = input.weeklyTrend.slice(-RECENT_WEEKS);

        const earlierWeeks = input.weeklyTrend.slice(0, -RECENT_WEEKS);

        const recentAggregate = this.averageAcrossWeeks(recentWeeks);

        const earlierAggregate = this.averageAcrossWeeks(earlierWeeks);

        const behaviorHighlights = "(summarized from recent weekly reports; see dashboard for details)";

        const prompt = this.ai.promptManager.compile(
            "learning-summary",
            {
                childName: input.childName,
                recentWeeksSummary: this.formatAggregate(recentAggregate),
                earlierWeeksSummary: earlierWeeks.length > 0
                    ? this.formatAggregate(earlierAggregate)
                    : "(not enough history yet)",
                behaviorHighlights
            }
        );

        const response = await this.ai.llmClient.generate({

            prompt,

            responseFormat: "json"

        });

        let summary: LearningSummary;

        try {

            summary = JsonParser.parse<LearningSummary>(
                response.text
            );

        }
        catch (error) {

            throw new Error(
                `LearningSummaryService: Invalid JSON response.\n${error}`
            );

        }

        this.validate(summary);

        return summary;

    }

    private averageAcrossWeeks(
        weeks: WeeklyTrendPoint[]
    ): SkillGrowthPoint[] {

        const bySkill = new Map<string, { total: number; count: number }>();

        for (const week of weeks) {

            for (const point of week.skillGrowth) {

                const entry = bySkill.get(point.skill) ?? { total: 0, count: 0 };

                entry.total += point.averageDelta * point.observationCount;

                entry.count += point.observationCount;

                bySkill.set(point.skill, entry);

            }

        }

        return [...bySkill.entries()].map(([skill, entry]) => ({

            skill,

            averageDelta: entry.count > 0 ? entry.total / entry.count : 0,

            observationCount: entry.count

        }));

    }

    private formatAggregate(
        points: SkillGrowthPoint[]
    ): string {

        if (points.length === 0) {
            return "(no observations)";
        }

        return points

            .map(point =>
                `${point.skill}: ${point.averageDelta.toFixed(2)} avg over ${point.observationCount} observation${point.observationCount === 1 ? "" : "s"}`
            )

            .join("\n");

    }

    private validate(
        summary: LearningSummary
    ): void {

        if (!summary.headline) {
            throw new Error("LearningSummary missing headline.");
        }

        if (!Array.isArray(summary.trendHighlights)) {
            throw new Error("LearningSummary missing trendHighlights.");
        }

        if (!summary.suggestedNextGoal) {
            throw new Error("LearningSummary missing suggestedNextGoal.");
        }

        if (!summary.suggestedNextGoalRationale) {
            throw new Error("LearningSummary missing suggestedNextGoalRationale.");
        }

    }

}
