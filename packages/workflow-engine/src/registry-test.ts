import { AgentRegistry } from "./registry/AgentRegistry";

import { DemoAgent } from "@storyforge/agent-sdk";

import {
MemoryStore,
MemoryClient
} from "@storyforge/agent-sdk";

const store = new MemoryStore();

const memory = new MemoryClient(store);

const registry = new AgentRegistry();

registry.register(
    "demo",
    new DemoAgent(memory)
);

console.log(
    registry.list()
);

console.log(
    registry.has("demo")
);

console.log(
    registry.get("demo")
);