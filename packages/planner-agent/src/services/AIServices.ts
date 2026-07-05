import { LLMClient } from "@storyforge/llm-client";
import { PromptManager } from "@storyforge/prompt-manager";

export interface AIServices {

    llmClient: LLMClient;

    promptManager: PromptManager;

}