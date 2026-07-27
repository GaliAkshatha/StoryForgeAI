import { LearningAnalytics } from "@storyforge/shared";

export interface LearningRepository {

    save(
        analytics: LearningAnalytics
    ): Promise<void>;

    findByChildId(
        childId: string,
        range?: { start: Date; end: Date }
    ): Promise<LearningAnalytics[]>;

}

export class InMemoryLearningRepository implements LearningRepository {

    private readonly recordsByChildId = new Map<string, LearningAnalytics[]>();

    async save(
        analytics: LearningAnalytics
    ): Promise<void> {

        const existing =
            this.recordsByChildId.get(analytics.childId) ?? [];

        existing.push(analytics);

        this.recordsByChildId.set(analytics.childId, existing);

    }

    async findByChildId(
        childId: string,
        range?: { start: Date; end: Date }
    ): Promise<LearningAnalytics[]> {

        const records = this.recordsByChildId.get(childId) ?? [];

        if (!range) {
            return records;
        }

        return records.filter(record => {

            const generatedAt = new Date(record.generatedAt).getTime();

            return (
                generatedAt >= range.start.getTime() &&
                generatedAt <= range.end.getTime()
            );

        });

    }

}
