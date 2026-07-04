import { BaseAgent } from "@storyforge/agent-sdk";

export class AgentRegistry {

    private agents = new Map<string, BaseAgent>();

    register(
        id: string,
        agent: BaseAgent
    ): void {

        this.agents.set(id, agent);

    }

    get(
        id: string
    ): BaseAgent {

        const agent = this.agents.get(id);

        if (!agent) {

            throw new Error(
                `Agent '${id}' is not registered.`
            );

        }

        return agent;

    }

    has(
        id: string
    ): boolean {

        return this.agents.has(id);

    }

    list(): string[] {

        return [...this.agents.keys()];

    }

}