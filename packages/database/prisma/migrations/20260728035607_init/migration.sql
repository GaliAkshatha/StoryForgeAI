-- AlterTable
ALTER TABLE "story_turns" ALTER COLUMN "reflectionQuestion" DROP NOT NULL;

-- CreateTable
CREATE TABLE "adventures" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "moral" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "characters" JSONB NOT NULL,
    "world" JSONB NOT NULL,
    "learningPlan" JSONB NOT NULL,
    "emotionCurve" JSONB NOT NULL,
    "genome" JSONB NOT NULL DEFAULT '{}',
    "rootNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adventures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_nodes" (
    "id" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "learningSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emotion" JSONB NOT NULL,
    "effects" JSONB NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "readingLevel" TEXT NOT NULL,
    "isEnding" BOOLEAN NOT NULL DEFAULT false,
    "endingType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_nodes_pkey" PRIMARY KEY ("adventureId","id")
);

-- CreateTable
CREATE TABLE "adventure_events" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "adventureId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "emotion" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adventure_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adventures_childId_idx" ON "adventures"("childId");

-- CreateIndex
CREATE INDEX "story_nodes_adventureId_idx" ON "story_nodes"("adventureId");

-- CreateIndex
CREATE INDEX "adventure_events_sessionId_createdAt_idx" ON "adventure_events"("sessionId", "createdAt");
