import { LLMClient } from "@storyforge/llm-client";
import { PromptManager } from "@storyforge/prompt-manager";
import { KnowledgeRetriever } from "@storyforge/knowledge-engine";

export interface AIServices {

    llmClient: LLMClient;

    promptManager: PromptManager;

    // Optional -- if wired, ResearchAgent grounds its output in
    // retrieved knowledge via Hybrid RAG. Falls back to pure LLM
    // generation if omitted, so this is backward compatible.
    knowledgeBase?: KnowledgeRetriever;

}
