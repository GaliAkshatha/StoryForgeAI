import { AdventureEvent } from "../models/AdventureEvent";

export interface AdventureEventRepository {

    append(
        event: AdventureEvent
    ): Promise<void>;

    findBySessionId(
        sessionId: string
    ): Promise<AdventureEvent[]>;

    // Events since a given point in time -- used to scope a
    // chapter-end summary to "since the last chapter boundary"
    // rather than the whole adventure's history.
    findBySessionIdSince(
        sessionId: string,
        since: string
    ): Promise<AdventureEvent[]>;

}
