import { ParentFeedback } from "../models/ParentFeedback";

export interface ParentFeedbackRepository {

    save(
        feedback: ParentFeedback
    ): Promise<void>;

    findByChildId(
        childId: string
    ): Promise<ParentFeedback[]>;

}

export class InMemoryParentFeedbackRepository implements ParentFeedbackRepository {

    private readonly records: ParentFeedback[] = [];

    async save(
        feedback: ParentFeedback
    ): Promise<void> {

        this.records.push(feedback);

    }

    async findByChildId(
        childId: string
    ): Promise<ParentFeedback[]> {

        return this.records.filter(record => record.childId === childId);

    }

}
