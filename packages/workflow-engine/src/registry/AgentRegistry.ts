import { BaseAgent } from "@storyforge/agent-sdk";

export class AgentRegistry {

    private readonly agents = new Map<string, BaseAgent>();

    register(
        id: string,
        agent: BaseAgent
    ): void {

        if (this.agents.has(id)) {

            throw new Error(
                `Agent '${id}' is already registered.`
            );

        }

        this.agents.set(id, agent);

    }

    get(id: string): BaseAgent {

        const agent = this.agents.get(id);

        if (!agent) {

            throw new Error(
                `Agent '${id}' not found.`
            );

        }

        return agent;

    }

    has(id: string): boolean {

        return this.agents.has(id);

    }

    list(): string[] {

        return [...this.agents.keys()];

    }

}