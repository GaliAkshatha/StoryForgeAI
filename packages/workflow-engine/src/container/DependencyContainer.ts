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

import {

    AdventureRepository,
    StoryNodeRepository,
    AdventureEventRepository,
    EmotionRepository,
    NpcMemoryRepository,
    AchievementRepository,
    StoryEdgeRepository,
    InMemoryAdventureRepository,
    InMemoryStoryNodeRepository,
    InMemoryAdventureEventRepository,
    InMemoryEmotionRepository,
    InMemoryNpcMemoryRepository,
    InMemoryAchievementRepository,
    DerivedStoryEdgeRepository,
    AdventureBlueprintGenerator,
    AdventureMetadataGenerator,
    InitialStoryBuilder,
    AdventureCompiler,
    GraphTraversalEngine,
    EmotionTrendService,
    EmotionTracker,
    CandidateEventGenerator,
    ConstraintEngine,
    EventScorer,
    SemanticEventBuilder,
    MemoryRetrievalService,
    DeterministicExpansionService,
    NarrationRenderingService,
    NarrativeQualityGate,
    ChapterProgressionEngine,
    NarrativeStateTransition,
    ChoiceCountPolicy

} from "@storyforge/story-graph";

import {

    TextRenderer,
    TemplateTextRenderer,
    GeminiTextRenderer,
    LanguageRouter

} from "@storyforge/llm-client";

import {

    DeterministicAnalyticsEngine

} from "@storyforge/learning";

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

    // Overrides the LLMClient LLMClientFactory would otherwise
    // build from the fields above -- primarily for tests (a fake
    // LLMClient that returns canned schema-conformant JSON, so
    // integration tests can exercise the real DependencyContainer
    // wiring without hitting a live provider). Same injection
    // pattern as worldStateStore/adventureRepository below.
    llmClient?: LLMClient;

    // Persistent World State (v2.0). Defaults to in-memory
    // implementations -- pass Postgres-backed ones (see
    // @storyforge/database) to survive server restarts. This is the
    // same injection point pattern as the LLM provider: agents and
    // the Consequence Engine only ever see the WorldStateStore /
    // StoryTurnRepository INTERFACES, never which implementation is
    // active.
    worldStateStore?: WorldStateStore;

    storyTurnRepository?: StoryTurnRepository;

    // Story Graph domain (v3). Same injection pattern -- defaults to
    // in-memory, pass Postgres-backed ones (see @storyforge/database)
    // to persist adventure blueprints across restarts.
    adventureRepository?: AdventureRepository;

    storyNodeRepository?: StoryNodeRepository;

    adventureEventRepository?: AdventureEventRepository;

    emotionRepository?: EmotionRepository;

    npcMemoryRepository?: NpcMemoryRepository;

    achievementRepository?: AchievementRepository;

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

    // Story Graph domain (v3)

    readonly adventureRepository: AdventureRepository;

    readonly storyNodeRepository: StoryNodeRepository;

    readonly adventureEventRepository: AdventureEventRepository;

    readonly emotionRepository: EmotionRepository;

    readonly npcMemoryRepository: NpcMemoryRepository;

    readonly achievementRepository: AchievementRepository;

    readonly storyEdgeRepository: StoryEdgeRepository;

    // @deprecated no longer wired into adventureCompiler -- see the
    // class's own @deprecated comment. Still constructed for
    // external-compatibility reasons.
    readonly adventureBlueprintGenerator: AdventureBlueprintGenerator;

    readonly adventureMetadataGenerator: AdventureMetadataGenerator;

    readonly initialStoryBuilder: InitialStoryBuilder;

    readonly adventureCompiler: AdventureCompiler;

    readonly graphTraversalEngine: GraphTraversalEngine;

    // Part 4: deterministic trait scoring -- never calls an LLM.
    readonly deterministicAnalyticsEngine: DeterministicAnalyticsEngine;

    readonly emotionTrendService: EmotionTrendService;

    readonly emotionTracker: EmotionTracker;

    // Phases B-M: the deterministic candidate-generation ->
    // constraint-filtering -> scoring -> semantic-event -> language
    // pipeline that replaced AdventureBlueprintGenerator.expandFrom()
    // for ongoing chapter expansion.
    readonly candidateEventGenerator: CandidateEventGenerator;

    readonly constraintEngine: ConstraintEngine;

    readonly eventScorer: EventScorer;

    readonly semanticEventBuilder: SemanticEventBuilder;

    readonly memoryRetrievalService: MemoryRetrievalService;

    readonly templateTextRenderer: TemplateTextRenderer;

    readonly languageRouter: TextRenderer;

    readonly choiceCountPolicy: ChoiceCountPolicy;

    readonly deterministicExpansionService: DeterministicExpansionService;

    // Section 3 (correction pass): renders a node's narrative lazily,
    // exactly once, only when the child actually reaches it.
    readonly narrativeQualityGate: NarrativeQualityGate;

    readonly narrationRenderingService: NarrationRenderingService;

    // Section C: deterministic chapter phase/ending-eligibility
    // policy. No LLM, no direct graph mutation -- AdventureRuntime
    // only ever asks it questions.
    readonly chapterProgressionEngine: ChapterProgressionEngine;

    // Phase 2A: the only thing allowed to mutate NarrativeState.
    readonly narrativeStateTransition: NarrativeStateTransition;

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
            config.llmClient ??
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

        // ------------------------------------------------------
        // Story Graph domain (v3: one expensive generation up
        // front, gameplay is pure traversal afterward)
        // ------------------------------------------------------

        this.adventureRepository =
            config.adventureRepository ?? new InMemoryAdventureRepository();

        this.storyNodeRepository =
            config.storyNodeRepository ?? new InMemoryStoryNodeRepository();

        this.adventureEventRepository =
            config.adventureEventRepository ?? new InMemoryAdventureEventRepository();

        this.emotionRepository =
            config.emotionRepository ?? new InMemoryEmotionRepository();

        this.npcMemoryRepository =
            config.npcMemoryRepository ?? new InMemoryNpcMemoryRepository();

        this.achievementRepository =
            config.achievementRepository ?? new InMemoryAchievementRepository();

        this.storyEdgeRepository =
            new DerivedStoryEdgeRepository(this.storyNodeRepository);

        this.adventureBlueprintGenerator = new AdventureBlueprintGenerator(ai);

        this.graphTraversalEngine = new GraphTraversalEngine(this.storyNodeRepository);

        this.deterministicAnalyticsEngine = new DeterministicAnalyticsEngine();

        this.emotionTrendService = new EmotionTrendService();

        this.emotionTracker = new EmotionTracker(this.emotionRepository, this.emotionTrendService);

        this.candidateEventGenerator = new CandidateEventGenerator();

        this.constraintEngine = new ConstraintEngine();

        this.eventScorer = new EventScorer();

        this.semanticEventBuilder = new SemanticEventBuilder();

        this.memoryRetrievalService = new MemoryRetrievalService();

        this.templateTextRenderer = new TemplateTextRenderer();

        this.languageRouter = new LanguageRouter(
            this.templateTextRenderer,
            new GeminiTextRenderer(this.llm)
        );

        this.choiceCountPolicy = new ChoiceCountPolicy();

        this.deterministicExpansionService = new DeterministicExpansionService(
            this.candidateEventGenerator,
            this.constraintEngine,
            this.eventScorer,
            this.memoryRetrievalService,
            this.semanticEventBuilder,
            this.choiceCountPolicy
        );

        this.chapterProgressionEngine = new ChapterProgressionEngine();

        this.narrativeStateTransition = new NarrativeStateTransition();

        this.narrativeQualityGate = new NarrativeQualityGate();

        this.narrationRenderingService = new NarrationRenderingService(
            this.languageRouter,
            this.storyNodeRepository,
            this.narrativeQualityGate,
            this.templateTextRenderer
        );

        // Correction pass: AdventureCompiler now composes a small
        // metadata call + the deterministic expansion pipeline
        // (already built above) instead of AdventureBlueprintGenerator's
        // single large call. adventureBlueprintGenerator is still
        // constructed (see above) for compatibility, but is no
        // longer wired into the compilation pipeline -- see its
        // class-level @deprecated comment.
        this.adventureMetadataGenerator = new AdventureMetadataGenerator(ai);

        this.initialStoryBuilder = new InitialStoryBuilder(
            this.deterministicExpansionService
        );

        this.adventureCompiler = new AdventureCompiler(
            this.adventureMetadataGenerator,
            this.initialStoryBuilder,
            this.adventureRepository,
            this.storyNodeRepository
        );

    }
}
