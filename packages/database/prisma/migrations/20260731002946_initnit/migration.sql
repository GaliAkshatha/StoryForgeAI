-- AlterTable
ALTER TABLE "story_nodes" ADD COLUMN     "eventType" TEXT,
ADD COLUMN     "pendingRenderRequest" JSONB,
ADD COLUMN     "targetCharacterId" TEXT,
ADD COLUMN     "targetCharacterName" TEXT;
