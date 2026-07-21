-- Duels match players of any skill level, so duel questions are now selected
-- flat and uniformly at random. The difficulty concept is removed from the
-- duel domain: drop the column, its index, and the (now unused) Difficulty enum.

-- DropIndex
DROP INDEX "DuelQuestion_difficulty_idx";

-- AlterTable
ALTER TABLE "DuelQuestion" DROP COLUMN "difficulty";

-- DropEnum
DROP TYPE "Difficulty";
