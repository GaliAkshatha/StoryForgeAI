export type ParentFeedbackAnswer = "yes" | "maybe" | "not_yet";

// Part 9: "After adventure, ask parent: Have you noticed this
// behaviour in real life?" Tied to a specific skill so future
// recommendations can weight toward what parents actually confirmed
// seeing.
export interface ParentFeedback {

    id: string;

    parentId: string;

    childId: string;

    skill: string;

    answer: ParentFeedbackAnswer;

    createdAt: string;

}
