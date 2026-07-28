-- CreateTable
CREATE TABLE "emotion_states" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "emotion" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emotion_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_memory" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npc_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emotion_states_childId_recordedAt_idx" ON "emotion_states"("childId", "recordedAt");

-- CreateIndex
CREATE INDEX "emotion_states_sessionId_recordedAt_idx" ON "emotion_states"("sessionId", "recordedAt");

-- CreateIndex
CREATE INDEX "npc_memory_worldId_characterId_idx" ON "npc_memory"("worldId", "characterId");

-- CreateIndex
CREATE INDEX "achievements_childId_idx" ON "achievements"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_childId_key_key" ON "achievements"("childId", "key");
