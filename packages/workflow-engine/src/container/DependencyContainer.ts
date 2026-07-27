import {
    MemoryStore,
    MemoryClient
} from "@storyforge/agent-sdk";

import {

    LLMClient,
    LLMClientFactory,
    LLMProviderName

} from "@storyforge/llm-client";

import {
    DefaultPromptManager,
    createPromptRepository
} from "@storyforge/prompt-manager";

import {
    RequirementAgent
} from "@storyforge/requirement-agent";

import {
    PlannerAgent
} from "@storyforge/planner-agent";

import {
    ResearchAgent
} from "@storyforge/research-agent";

import {
    StoryAgent
} from "@storyforge/story-agent";

import {
    CriticAgent
} from "@storyforge/critic-agent";

import {
    ReflectionAgent
} from "@storyforge/reflection-agent";

import {
    AnalyticsAgent
} from "@storyforge/analytics-agent";

import {

    OllamaEmbeddingClient,
    InMemoryVectorStore,
    BM25Index,
    HybridRetriever,
    KnowledgeBase,
    DEFAULT_KNOWLEDGE_CONFIG

} from "@storyforge/knowledge-engine";

import {

    WorldStateStore,
    StoryTurnRepository,
    InMemoryWorldStateStore,
    InMemoryStoryTurnRepository,
    ConsequenceEngine

} from "@storyforge/simulation-engine";

export interface DependencyContainerConfig {

    // Which LLM provider powers narrative/reasoning generation.
    // Defaults to "gemini" as of v2.0 -- Ollama remains fully
    // supported for local/offline use. This field, and this field
    // ALONE, decides the provider. No agent, prompt, or downstream
    // service ever branches on it -- they all depend on the
    // LLMClient interface.
    provider?: LLMProviderName;

    geminiApiKey?: string;

    geminiModel?: string;

    // Ollama is used two ways: (1) as the optional LLM provider when
    // provider === "ollama", and (2) regardless of provider choice,
    // as the embedding server -- nomic-embed-text is Ollama-only per
    // the mandatory AI Stack, so embeddings never move to Gemini.
    ollamaBaseUrl?: string;

    ollamaModel?: string;

    embeddingModel?: string;

    // Persistent World State (v2.0). Defaults to in-memory
    // implementations -- pass Postgres-backed ones (see
    // @storyforge/database) to survive server restarts. This is the
    // same injection point pattern as the LLM provider: agents and
    // the Consequence Engine only ever see the WorldStateStore /
    // StoryTurnRepository INTERFACES, never which implementation is
    // active.
    worldStateStore?: WorldStateStore;

    storyTurnRepository?: StoryTurnRepository;

}

export class DependencyContainer {

    readonly memoryStore: MemoryStore;

    readonly memory: MemoryClient;

    readonly llm: LLMClient;

    readonly promptManager: DefaultPromptManager;

    // AI Agents (7, per the Master Prompt)

    readonly requirementAgent: RequirementAgent;

    readonly plannerAgent: PlannerAgent;

    readonly researchAgent: ResearchAgent;

    readonly storyAgent: StoryAgent;

    readonly criticAgent: CriticAgent;

    readonly reflectionAgent: ReflectionAgent;

    readonly analyticsAgent: AnalyticsAgent;

    // Knowledge domain (Hybrid RAG)

    readonly knowledgeBase: KnowledgeBase;

    // Simulation domain (World State + Consequence Engine)

    readonly worldStateStore: WorldStateStore;

    readonly storyTurnRepository: StoryTurnRepository;

    readonly consequenceEngine: ConsequenceEngine;

    constructor(
        config: DependencyContainerConfig
    ) {

        this.memoryStore =
            new MemoryStore();

        this.memory =
            new MemoryClient(
                this.memoryStore
            );

        this.promptManager =
            new DefaultPromptManager(

                createPromptRepository()

            );

        this.llm =
            LLMClientFactory.create({

                provider: config.provider,

                geminiApiKey: config.geminiApiKey,

                geminiModel: config.geminiModel,

                ollamaBaseUrl: config.ollamaBaseUrl,

                ollamaModel: config.ollamaModel

            });

        const ai = {

            llmClient:
                this.llm,

            promptManager:
                this.promptManager

        };

        // ------------------------------------------------------
        // Knowledge domain (Hybrid RAG: Ollama + nomic-embed-text
        // + Chroma-compatible vector store + BM25 + RRF)
        // ------------------------------------------------------

        const embeddingClient = new OllamaEmbeddingClient({

            baseUrl:
                config.ollamaBaseUrl ??
                DEFAULT_KNOWLEDGE_CONFIG.ollamaBaseUrl,

            model:
                config.embeddingModel ??
                DEFAULT_KNOWLEDGE_CONFIG.embeddingModel

        });

        // Defaults to an in-memory vector store so the platform runs
        // out of the box without a ChromaDB instance. Swap in
        // ChromaVectorStore (same VectorStore interface) once Chroma
        // is deployed -- no other code needs to change.
        const vectorStore = new InMemoryVectorStore();

        const keywordIndex = new BM25Index();

        const hybridRetriever = new HybridRetriever({

            embeddingClient,

            vectorStore,

            keywordIndex

        });

        this.knowledgeBase = new KnowledgeBase(hybridRetriever);

        // ------------------------------------------------------
        // AI Agents
        // ------------------------------------------------------

        this.requirementAgent =
            new RequirementAgent(

                this.memory,

                ai

            );

        this.plannerAgent =
            new PlannerAgent(

                this.memory,

                ai

            );

        this.researchAgent =
            new ResearchAgent(

                this.memory,

                {
                    ...ai,
                    knowledgeBase: this.knowledgeBase
                }

            );

        this.storyAgent =
            new StoryAgent(

                this.memory,

                ai

            );

        this.criticAgent =
            new CriticAgent(

                this.memory,

                ai

            );

        this.reflectionAgent =
            new ReflectionAgent(

                this.memory,

                ai

            );

        this.analyticsAgent =
            new AnalyticsAgent(

                this.memory,

                ai

            );

        // ------------------------------------------------------
        // Simulation domain (World State is the source of truth)
        // ------------------------------------------------------

        this.worldStateStore =
            config.worldStateStore ?? new InMemoryWorldStateStore();

        this.storyTurnRepository =
            config.storyTurnRepository ?? new InMemoryStoryTurnRepository();

        this.consequenceEngine = new ConsequenceEngine(ai);

    }
}
