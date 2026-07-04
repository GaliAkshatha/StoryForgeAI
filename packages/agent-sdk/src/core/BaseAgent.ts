import { AgentContext } from "./AgentContext";
import { AgentResult } from "./AgentResult";

import { Logger } from "../logging/Logger";
import { Validator } from "../validation/Validator";
import { MemoryClient } from "../memory/MemoryClient";

export abstract class BaseAgent<TInput = unknown, TOutput = unknown> {

    protected readonly logger = new Logger();

    protected readonly validator = new Validator();

    constructor(
        protected readonly memory: MemoryClient
    ) {}

    
    async run(
        context: AgentContext
    ): Promise<AgentResult<TOutput>> {
        this.logger.clear();

        const start = performance.now();

        const validation = this.validator.validateRequired(
            context.input,
            "input"
        );

        if (!validation.isValid) {

            return {
                success: false,
                error: validation.errors.join(", "),
                logs: [],
                metrics: {
                    executionTimeMs: 0
                }
            };

        }

        this.logger.info(
            `${context.agentName} started`,
            context.agentName
        );

        try {
            const output = await this.execute(context);

            const end = performance.now();

            this.logger.info(
                `${context.agentName} completed`,
                context.agentName
            );

            return {
                success: true,
                output,
                logs: this.logger.getLogs().map(log => log.message),
                metrics: {
                    executionTimeMs: end - start
                }
            };
        }
        catch (error) {

            this.logger.error(
                error instanceof Error ? error.message : "Unknown Error",
                context.agentName
            );

            return {
                success: false,
                error: error instanceof Error
                ? error.message
                : "Unknown Error",

                logs: this.logger.getLogs().map(log => log.message),

                metrics: {
                    executionTimeMs: performance.now() - start
                }
            };
        }

    }

    protected abstract execute(
        context: AgentContext
    ): Promise<TOutput>;

}