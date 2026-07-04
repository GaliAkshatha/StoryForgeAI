import { DemoAgent } from "./core/DemoAgent";

import { MemoryStore } from "./memory/MemoryStore";
import { MemoryClient } from "./memory/MemoryClient";

const store = new MemoryStore();

const memory = new MemoryClient(store);

const agent = new DemoAgent(memory);

const result = await agent.run({

    projectId: "1",

    workflowRunId: "1",

    executionId: "1",

    agentName: "DemoAgent",

    input: {},

    sharedMemory: {},

    config: {},

    metadata: {
        startedAt: new Date(),
        retryCount: 0
    }

});

console.log(result);
