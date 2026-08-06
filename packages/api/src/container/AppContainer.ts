import {
    AuthService,
    ApiKeyEncryption,
    InMemoryUserRepository,
    UserRepository
} from "@storyforge/identity";

import {
    ParentService,
    InMemoryParentRepository,
    ParentRepository
} from "@storyforge/parent";

import {
    ChildService,
    InMemoryChildRepository,
    ChildRepository
} from "@storyforge/child";

import {
    LearningService,
    LearningGoalService,
    LearningSummaryService,
    InMemoryLearningRepository,
    LearningRepository
} from "@storyforge/learning";

import {
    createPrismaClient,
    PrismaClient,
    PostgresUserRepository,
    PostgresParentRepository,
    PostgresChildRepository,
    PostgresLearningRepository,
    PostgresWorldStateStore,
    PostgresStoryTurnRepository,
    PostgresAdventureRepository,
    PostgresStoryNodeRepository,
    PostgresAdventureEventRepository,
    PostgresEmotionRepository,
    PostgresNpcMemoryRepository,
    PostgresAchievementRepository
} from "@storyforge/database";

import {
    WorldStateStore,
    StoryTurnRepository
} from "@storyforge/simulation-engine";

import {
    AdventureRepository,
    StoryNodeRepository,
    AdventureEventRepository,
    EmotionRepository,
    NpcMemoryRepository,
    AchievementRepository
} from "@storyforge/story-graph";

import {
    DependencyContainer,
    DependencyContainerConfig,
    AdventureRuntime,
    WorkflowRuntime
} from "@storyforge/workflow-engine";

export interface AppConfig extends DependencyContainerConfig {

    // "postgres" (default) persists everything via Prisma and
    // requires DATABASE_URL. "memory" keeps the original in-memory
    // repositories -- useful for local dev/tests without a database,
    // but data does not survive a restart.
    persistence?: "postgres" | "memory";

    // JWT signing secret for parent auth sessions (v2.0). Required.
    jwtSecret: string;

    tokenTtlSeconds?: number;

    // BYOK (Part 4): server-side secret used to encrypt user-provided
    // Gemini API keys at rest. Without it, setApiKey/removeApiKey are
    // unavailable (AuthService throws a clear error) but the app
    // still runs on the global GEMINI_API_KEY as before.
    encryptionKey?: string;

}

// The single composition root for the API process. Every route
// handler depends on this, never on concrete repositories or
// clients directly -- swapping any repository implementation only
// touches this file. Repository INTERFACES (UserRepository,
// ParentRepository, ChildRepository, LearningRepository) are
// untouched by this change; only which implementation satisfies them
// changed.
export class AppContainer {

    readonly auth: AuthService;

    readonly parents: ParentService;

    readonly children: ChildService;

    readonly learning: LearningService;

    readonly learningGoals: LearningGoalService;

    readonly learningSummaries: LearningSummaryService;

    readonly ai: DependencyContainer;

    readonly adventures: AdventureRuntime;

    // Phase O: no longer constructed by default -- see the
    // constructor for why. Optional so nothing else needs to change;
    // any future caller that wants it can construct it directly from
    // `this.ai`'s already-available agent instances.
    readonly storyWorkflow?: WorkflowRuntime;

    readonly prisma?: PrismaClient;

    // BYOK (Part 4, completed): per-user AdventureRuntime instances,
    // each built with that user's own decrypted Gemini key instead of
    // the global one. Built lazily on first gameplay request per user
    // (constructing DependencyContainer is cheap -- pure object-graph
    // wiring, no network I/O), then cached and reused across that
    // user's subsequent requests. Concurrent requests from DIFFERENT
    // users must never share one LLMClient instance whose key gets
    // mutated in place -- Node's single-threaded event loop still
    // interleaves concurrent async requests, so a shared mutable key
    // would risk one user's request using another user's key
    // mid-flight. A fresh container per user avoids that entirely.
    private readonly perUserRuntimes = new Map<string, AdventureRuntime>();

    private static readonly MAX_CACHED_USER_RUNTIMES = 200;

    private readonly baseAiConfig: DependencyContainerConfig;

    constructor(config: AppConfig) {

        const persistence = config.persistence ?? "postgres";

        let userRepository: UserRepository;

        let parentRepository: ParentRepository;

        let childRepository: ChildRepository;

        let learningRepository: LearningRepository;

        let worldStateStore: WorldStateStore | undefined;

        let storyTurnRepository: StoryTurnRepository | undefined;

        let adventureRepository: AdventureRepository | undefined;

        let storyNodeRepository: StoryNodeRepository | undefined;

        let adventureEventRepository: AdventureEventRepository | undefined;

        let emotionRepository: EmotionRepository | undefined;

        let npcMemoryRepository: NpcMemoryRepository | undefined;

        let achievementRepository: AchievementRepository | undefined;

        if (persistence === "postgres") {

            this.prisma = createPrismaClient();

            userRepository = new PostgresUserRepository(this.prisma);

            parentRepository = new PostgresParentRepository(this.prisma);

            childRepository = new PostgresChildRepository(this.prisma);

            learningRepository = new PostgresLearningRepository(this.prisma);

            worldStateStore = new PostgresWorldStateStore(this.prisma);

            storyTurnRepository = new PostgresStoryTurnRepository(this.prisma);

            adventureRepository = new PostgresAdventureRepository(this.prisma);

            storyNodeRepository = new PostgresStoryNodeRepository(this.prisma);

            adventureEventRepository = new PostgresAdventureEventRepository(this.prisma);

            emotionRepository = new PostgresEmotionRepository(this.prisma);

            npcMemoryRepository = new PostgresNpcMemoryRepository(this.prisma);

            achievementRepository = new PostgresAchievementRepository(this.prisma);

        }
        else {

            userRepository = new InMemoryUserRepository();

            parentRepository = new InMemoryParentRepository();

            childRepository = new InMemoryChildRepository();

            learningRepository = new InMemoryLearningRepository();

            // worldStateStore / storyTurnRepository / adventureRepository
            // / storyNodeRepository / adventureEventRepository /
            // emotionRepository / npcMemoryRepository /
            // achievementRepository stay undefined --
            // DependencyContainer falls back to its own in-memory
            // defaults, same as before v2.0.

        }

        this.auth = new AuthService(
            userRepository,
            {

                jwtSecret: config.jwtSecret,

                tokenTtlSeconds: config.tokenTtlSeconds

            },
            config.encryptionKey ? new ApiKeyEncryption(config.encryptionKey) : undefined
        );

        this.parents = new ParentService(parentRepository);

        this.children = new ChildService(childRepository);

        this.learning = new LearningService(learningRepository);

        this.baseAiConfig = {

            ...config,

            worldStateStore,

            storyTurnRepository,

            adventureRepository,

            storyNodeRepository,

            adventureEventRepository,

            emotionRepository,

            npcMemoryRepository,

            achievementRepository

        };

        this.ai = new DependencyContainer(this.baseAiConfig);

        this.adventures = new AdventureRuntime(this.ai);

        this.learningGoals = new LearningGoalService({

            llmClient: this.ai.llm,

            promptManager: this.ai.promptManager

        });

        this.learningSummaries = new LearningSummaryService({

            llmClient: this.ai.llm,

            promptManager: this.ai.promptManager

        });

        // Phase O (deprecation): storyWorkflow (RequirementAgent ->
        // PlannerAgent -> ResearchAgent -> StoryAgent -> CriticAgent,
        // the original linear content-generation pipeline) is no
        // longer constructed here. The audit confirmed zero API
        // routes ever call .run() on it -- it was entirely
        // superseded by the graph-based AdventureRuntime. The
        // classes themselves are NOT deleted (real, tested code;
        // deleting without a clear future-use decision would be
        // premature per this migration's constraints) -- only
        // removed from the active composition root. To reinstate:
        // `this.storyWorkflow = new WorkflowRuntime(this.ai.requirementAgent, ...)`,
        // same as before.

    }

    // Must be called whenever a user's key changes (set/removed) --
    // otherwise they'd keep hitting a cached runtime built with their
    // OLD key (or, after removal, silently keep using a key they
    // just revoked).
    invalidateUserRuntime(
        userId: string
    ): void {

        this.perUserRuntimes.delete(userId);

    }

    async shutdown(): Promise<void> {

        await this.prisma?.$disconnect();

    }

    // BYOK (Part 4, completion): the method routes actually call.
    // Falls back to the shared global runtime (this.adventures) when
    // the user has no key of their own, or when API key management
    // isn't configured (no ENCRYPTION_KEY) -- so BYOK is additive,
    // never a requirement to keep the app working.
    async getAdventureRuntimeForUser(
        userId: string
    ): Promise<AdventureRuntime> {

        const cached = this.perUserRuntimes.get(userId);

        if (cached) {
            return cached;
        }

        const userApiKey = await this.auth.getDecryptedApiKey(userId);

        if (!userApiKey) {
            return this.adventures;
        }

        const userContainer = new DependencyContainer({

            ...this.baseAiConfig,

            // The one field that actually changes -- every
            // repository, and every other setting, is shared with
            // the global container so persistence stays unified.
            geminiApiKey: userApiKey,

            // A per-user key means a per-user LLMClient is required
            // too -- llmClient (if the base config set one, e.g. in
            // tests) must NOT be reused here, or the override above
            // would have no effect.
            llmClient: undefined

        });

        const userRuntime = new AdventureRuntime(userContainer);

        if (this.perUserRuntimes.size >= AppContainer.MAX_CACHED_USER_RUNTIMES) {

            // Simple bounded cache: evict the oldest entry (Map
            // preserves insertion order) rather than let this grow
            // unboundedly across a long-running server's lifetime.
            const oldestKey = this.perUserRuntimes.keys().next().value;

            if (oldestKey !== undefined) {
                this.perUserRuntimes.delete(oldestKey);
            }

        }

        this.perUserRuntimes.set(userId, userRuntime);

        return userRuntime;

    }

}
