-- AlterTable
ALTER TABLE "story_nodes" ADD COLUMN     "characterIntroducedId" TEXT,
ADD COLUMN     "characterIntroducedName" TEXT,
ADD COLUMN     "narrativeConsequence" TEXT,
ADD COLUMN     "threadIntroduced" TEXT,
ADD COLUMN     "threadResolved" TEXT;

-- AlterTable
ALTER TABLE "world_states" ADD COLUMN     "narrativeState" JSONB;
