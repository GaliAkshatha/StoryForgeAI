import {
    AuthService,
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
    AdventureRuntime,
    WorkflowRuntime,
    DependencyContainerConfig
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

        this.auth = new AuthService(userRepository, {

            jwtSecret: config.jwtSecret,

            tokenTtlSeconds: config.tokenTtlSeconds

        });

        this.parents = new ParentService(parentRepository);

        this.children = new ChildService(childRepository);

        this.learning = new LearningService(learningRepository);

        this.ai = new DependencyContainer({

            ...config,

            worldStateStore,

            storyTurnRepository,

            adventureRepository,

            storyNodeRepository,

            adventureEventRepository,

            emotionRepository,

            npcMemoryRepository,

            achievementRepository

        });

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

    async shutdown(): Promise<void> {

        await this.prisma?.$disconnect();

    }

}
