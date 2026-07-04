import { BaseAgent } from "./BaseAgent";
import { AgentContext } from "./AgentContext";

import { MemoryClient } from "../memory/MemoryClient";

export class DemoAgent extends BaseAgent {

    constructor(memory: MemoryClient) {
        super(memory);
    }

    protected async execute(
        context: AgentContext
    ): Promise<string> {

        return `Hello ${context.agentName}!`;

    }

}