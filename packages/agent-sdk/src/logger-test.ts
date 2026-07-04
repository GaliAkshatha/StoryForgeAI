import { Logger } from "./logging/Logger";

const logger = new Logger();

logger.info("Planning Started", "PlannerAgent");

logger.warn("Using cached result", "ResearchAgent");

logger.error("Prompt not found", "StoryAgent");

console.log(logger.getLogs());