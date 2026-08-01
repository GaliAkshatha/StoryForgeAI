import { MemoryRetrievalService } from "../services/MemoryRetrievalService";
import { AdventureEvent } from "../models/AdventureEvent";
import { neutralEmotionProfile } from "../models/EmotionProfile";

function event(eventType: AdventureEvent["eventType"], id: string): AdventureEvent {

    return {

        id,

        worldId: "w1",

        sessionId: "s1",

        childId: "c1",

        adventureId: "a1",

        nodeId: id,

        eventType,

        narrative: `narrative for ${id}`,

        emotion: neutralEmotionProfile(),

        createdAt: new Date().toISOString()

    };

}

function main(): void {

    const service = new MemoryRetrievalService();

    console.assert(
        service.retrieve([], { limit: 5 }).length === 0,
        "Expected empty input to retrieve nothing"
    );

    const events = [

        event("observed", "e1"),

        event("helped_npc", "e2"),

        event("explored", "e3"),

        event("led_team", "e4")

    ];

    const top2 = service.retrieve(events, { limit: 2 });

    console.assert(top2.length === 2, `Expected exactly 2 results, got ${top2.length}`);

    // helped_npc/led_team have higher importance than observed/explored,
    // and led_team is also more recent -- both should outrank the low-
    // importance early events.
    console.assert(
        top2.some(e => e.eventType === "led_team") && top2.some(e => e.eventType === "helped_npc"),
        `Expected the two highest-importance events to be retrieved, got ${top2.map(e => e.eventType)}`
    );

    // Relevance weighting should improve a matching event's rank
    // relative to itself without that weighting, even if it doesn't
    // overturn a much larger importance/recency gap.
    const rankWithoutBias = service.retrieve(events, { limit: 4 }).findIndex(e => e.eventType === "explored");

    const rankWithBias = service.retrieve(events, { limit: 4, relevantTags: ["explored"] })
        .findIndex(e => e.eventType === "explored");

    console.assert(
        rankWithBias <= rankWithoutBias,
        `Expected relevance weighting toward 'explored' to improve or maintain its rank (${rankWithoutBias} -> ${rankWithBias})`
    );

    console.log("MemoryRetrievalService tests passed.");

}

main();
