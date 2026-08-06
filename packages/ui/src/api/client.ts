const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export interface ParentProfile {
    id: string;
    userId: string;
    displayName: string;
    childIds: string[];
    settings: { weeklyReportEmailEnabled: boolean; dailyPlayLimitMinutes: number };
}

export interface ChildProfile {
    id: string;
    parentId: string;
    name: string;
    ageRange: string;
    readingLevel: string;
    vocabularyLevel: string;
    avatarId: string;
    aboutChild?: string;
    adventureWorldIds: string[];
}

export interface SkillGrowthPoint {
    skill: string;
    averageDelta: number;
    observationCount: number;
}

export interface LearningRecommendation {
    title: string;
    description: string;
    basedOnSkill: string;
}

export interface WeeklyReport {
    childId: string;
    weekStart: string;
    weekEnd: string;
    sessionsPlayed: number;
    skillGrowth: SkillGrowthPoint[];
    behaviorHighlights: string[];
    recommendations: LearningRecommendation[];
    summary: string;
}

export interface Choice {
    id: string;
    text: string;
}

export interface LearningObjective {
    moral: string;
    skillFocus: string[];
    domain: string;
    rationale: string;
}

export interface Reflection {
    question: string;
    followUpQuestions: string[];
    observedThemes: string[];
    encouragement: string;
}

export interface LearningAnalyticsResult {
    skillSignals: { skill: string; observation: string; delta: number }[];
    behaviorNotes: string[];
    summary: string;
}

export interface StartAdventureResult {
    worldId: string;
    sessionId: string;
    narrative: string;
    choices: Choice[];
    isEnding: boolean;
    emotionalTone: string;
    objective: LearningObjective;
}

export interface AdventureTurnResult {
    narrative: string;
    choices: Choice[];
    isEnding: boolean;
    emotionalTone: string;
    learningSignals: string[];
    // v3: only populated on the turn that concludes a chapter --
    // Reflection/Analytics no longer run every turn.
    reflection?: Reflection;
    analytics?: LearningAnalyticsResult;
}

export interface LearningSummary {
    headline: string;
    trendHighlights: string[];
    suggestedNextGoal: string;
    suggestedNextGoalRationale: string;
}

export interface WeeklyTrendPoint {
    weekStart: string;
    weekEnd: string;
    sessionsPlayed: number;
    skillGrowth: SkillGrowthPoint[];
}

class ApiError extends Error {}

async function request<T>(
    path: string,
    options: RequestInit & { token?: string } = {}
): Promise<T> {

    const { token, headers, ...rest } = options;

    const response = await fetch(`${BASE_URL}${path}`, {

        ...rest,

        headers: {

            "Content-Type": "application/json",

            ...(token ? { Authorization: `Bearer ${token}` } : {}),

            ...headers

        }

    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {

        throw new ApiError(body?.error ?? `Request to ${path} failed.`);

    }

    return body as T;

}

export const api = {

    register(email: string, password: string, displayName: string) {

        return request<{ token: string; parent: ParentProfile }>(
            "/auth/register",
            { method: "POST", body: JSON.stringify({ email, password, displayName }) }
        );

    },

    login(email: string, password: string) {

        return request<{ token: string; parent: ParentProfile }>(
            "/auth/login",
            { method: "POST", body: JSON.stringify({ email, password }) }
        );

    },

    // BYOK -- these call the already-existing /settings/api-key
    // routes (built and tested separately from this frontend work).
    // No backend change here, just the frontend finally using them.
    getApiKeyStatus(token: string) {

        return request<{ connected: boolean }>("/settings/api-key", { token });

    },

    setApiKey(token: string, apiKey: string) {

        return request<{ connected: boolean }>(
            "/settings/api-key",
            { method: "PUT", token, body: JSON.stringify({ apiKey }) }
        );

    },

    removeApiKey(token: string) {

        return request<{ connected: boolean }>(
            "/settings/api-key",
            { method: "DELETE", token }
        );

    },

    listChildren(token: string) {

        return request<{ children: ChildProfile[] }>("/children", { token });

    },

    createChild(
        token: string,
        input: {
            name: string;
            ageRange: string;
            readingLevel?: string;
            vocabularyLevel?: string;
            avatarId?: string;
            aboutChild?: string;
        }
    ) {

        return request<{ child: ChildProfile }>("/children", {
            method: "POST",
            token,
            body: JSON.stringify(input)
        });

    },

    startAdventure(
        token: string,
        input: { childId: string; location: string; learningGoal: string }
    ) {

        return request<StartAdventureResult>(
            "/adventures/start",
            { method: "POST", token, body: JSON.stringify(input) }
        );

    },

    playTurn(
        token: string,
        input: {
            worldId: string;
            sessionId: string;
            childId: string;
            selectedChoiceId: string;
        }
    ) {

        return request<AdventureTurnResult>(
            "/adventures/turn",
            { method: "POST", token, body: JSON.stringify(input) }
        );

    },

    weeklyReport(token: string, childId: string) {

        return request<{ report: WeeklyReport }>(
            `/reports/${childId}/weekly`,
            { token }
        );

    },

    weeklyTrend(token: string, childId: string) {

        return request<{ weeklyTrend: WeeklyTrendPoint[]; summary: LearningSummary | null }>(
            `/reports/${childId}/trend`,
            { token }
        );

    },

    // Part 14: resume an in-progress adventure exactly where it was
    // left off -- no new AI call, just reading back the persisted
    // WorldState.
    resumeAdventure(token: string, worldId: string) {

        return request<{ worldId: string; narrative: string; choices: Choice[]; turn: number }>(
            `/adventures/${worldId}/state`,
            { token }
        );

    },

    me(token: string) {

        return request<{ parent: ParentProfile }>("/auth/me", { token });

    },

    updateProfile(
        token: string,
        updates: { displayName?: string; settings?: Partial<ParentProfile["settings"]> }
    ) {

        return request<{ parent: ParentProfile }>("/parents/me", {
            method: "PATCH",
            token,
            body: JSON.stringify(updates)
        });

    },

    changePassword(
        token: string,
        input: { currentPassword: string; newPassword: string }
    ) {

        return request<{ success: boolean }>("/auth/change-password", {
            method: "POST",
            token,
            body: JSON.stringify(input)
        });

    }

};
