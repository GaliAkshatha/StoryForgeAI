import { CategoryScores } from "./common/CategoryScores";

export interface StoryCritique {

    overallScore: number;

    categoryScores: CategoryScores;

    strengths: string[];

    weaknesses: string[];

    consistencyIssues: string[];

    audienceIssues: string[];

    pacingIssues: string[];

    grammarIssues: string[];

    suggestions: string[];

}