export interface ParentSettings {

    weeklyReportEmailEnabled: boolean;

    // Max minutes per adventure session -- a control parents own,
    // per the Master Prompt's "Controls settings" responsibility.
    dailyPlayLimitMinutes: number;

}

export interface ParentProfile {

    id: string;

    userId: string;

    displayName: string;

    childIds: string[];

    settings: ParentSettings;

    createdAt: string;

}

export function createDefaultSettings(): ParentSettings {

    return {

        weeklyReportEmailEnabled: true,

        dailyPlayLimitMinutes: 30

    };

}
