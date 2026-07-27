-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "childIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weeklyReportEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyPlayLimitMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_profiles" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "readingLevel" TEXT NOT NULL,
    "vocabularyLevel" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "aboutChild" TEXT,
    "adventureWorldIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_states" (
    "worldId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "inventory" JSONB NOT NULL,
    "relationships" JSONB NOT NULL,
    "quests" JSONB NOT NULL,
    "economy" JSONB NOT NULL,
    "flags" JSONB NOT NULL,
    "moral" TEXT NOT NULL DEFAULT '',
    "domain" TEXT NOT NULL DEFAULT '',
    "currentNarrative" TEXT NOT NULL DEFAULT '',
    "currentChoices" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_states_pkey" PRIMARY KEY ("worldId")
);

-- CreateTable
CREATE TABLE "story_turns" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "situationText" TEXT NOT NULL,
    "decisionText" TEXT NOT NULL,
    "consequenceNarrative" TEXT NOT NULL,
    "reflectionQuestion" TEXT NOT NULL,
    "learningSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_analytics_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "skillSignals" JSONB NOT NULL,
    "behaviorNotes" TEXT[],
    "summary" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_analytics_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "parent_profiles_userId_key" ON "parent_profiles"("userId");

-- CreateIndex
CREATE INDEX "child_profiles_parentId_idx" ON "child_profiles"("parentId");

-- CreateIndex
CREATE INDEX "world_states_childId_idx" ON "world_states"("childId");

-- CreateIndex
CREATE INDEX "story_turns_sessionId_createdAt_idx" ON "story_turns"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "story_turns_worldId_idx" ON "story_turns"("worldId");

-- CreateIndex
CREATE INDEX "learning_analytics_records_childId_generatedAt_idx" ON "learning_analytics_records"("childId", "generatedAt");
