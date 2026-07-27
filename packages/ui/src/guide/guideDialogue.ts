export type GuideKey =
    | "landing"
    | "auth-login"
    | "auth-register"
    | "dashboard-empty"
    | "dashboard"
    | "account"
    | "create-child"
    | "weekly-report"
    | "adventure-start"
    | "adventure-situation"
    | "adventure-consequence"
    | "adventure-reflection";

export interface GuideLine {

    mood: "idle" | "excited" | "thinking";

    text: string;

}

// One or more lines per screen -- picked at random so Ember doesn't
// repeat itself verbatim on every visit to the same step.
const LINES: Record<GuideKey, GuideLine[]> = {

    landing: [
        { mood: "excited", text: "Welcome, traveler! I'm Ember. I light the way through every story here." },
        { mood: "idle", text: "Every great adventure starts with a single choice. Ready for yours?" }
    ],

    "auth-login": [
        { mood: "idle", text: "Welcome back! Sign in and let's see who's waiting for their next chapter." }
    ],

    "auth-register": [
        { mood: "excited", text: "A new family joining the realm! Tell me a little about yourselves." }
    ],

    "dashboard-empty": [
        { mood: "thinking", text: "No storybooks on this shelf yet. Shall we create one for your first hero?" }
    ],

    dashboard: [
        { mood: "idle", text: "This is the Study — everything you need to watch your heroes grow." },
        { mood: "idle", text: "Peek at the weekly report anytime. I keep notes on every adventure." }
    ],

    account: [
        { mood: "idle", text: "Your own little corner of the Study. Update anything you like here." }
    ],

    "create-child": [
        { mood: "excited", text: "A new hero! What shall we call them, and how do they read best?" }
    ],

    "weekly-report": [
        { mood: "thinking", text: "Here's what I noticed this week — only the things they actually did, I promise." }
    ],

    "adventure-start": [
        { mood: "excited", text: "The gate to the story is open. Where should we begin?" }
    ],

    "adventure-situation": [
        { mood: "thinking", text: "Hmm, tricky. What would you do here?" },
        { mood: "idle", text: "Take your time — every choice shapes what happens next." }
    ],

    "adventure-consequence": [
        { mood: "excited", text: "Ooh, look what happened! The world remembers what you chose." }
    ],

    "adventure-reflection": [
        { mood: "thinking", text: "Let's think about that together for a moment..." }
    ]

};

export function pickGuideLine(key: GuideKey): GuideLine {

    const options = LINES[key];

    return options[Math.floor(Math.random() * options.length)];

}
