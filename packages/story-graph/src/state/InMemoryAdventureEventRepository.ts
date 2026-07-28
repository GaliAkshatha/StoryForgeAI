import { AdventureEventRepository } from "../interfaces/AdventureEventRepository";
import { AdventureEvent } from "../models/AdventureEvent";

export class InMemoryAdventureEventRepository implements AdventureEventRepository {

    private readonly events: AdventureEvent[] = [];

    async append(
        event: AdventureEvent
    ): Promise<void> {

        this.events.push(event);

    }

    async findBySessionId(
        sessionId: string
    ): Promise<AdventureEvent[]> {

        return this.events.filter(event => event.sessionId === sessionId);

    }

    async findBySessionIdSince(
        sessionId: string,
        since: string
    ): Promise<AdventureEvent[]> {

        const sinceTime = new Date(since).getTime();

        return this.events.filter(
            event =>
                event.sessionId === sessionId &&
                new Date(event.createdAt).getTime() >= sinceTime
        );

    }

}
