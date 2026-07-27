import { StateEffect } from "./StateEffect";

// The backend-facing summary of "what changed" for a turn. Composed
// from the same StateEffect[] the DeterministicSimulator already
// validates and applies -- this is a presentation of that data, not
// a second source of truth. The frontend never sees this; only the
// API/backend consumes it (per the Master Prompt's AI Output Format:
// "Backend consumes world updates and learning signals").
export interface WorldUpdate {

    effects: StateEffect[];

    turn: number;

    location: string;

}
