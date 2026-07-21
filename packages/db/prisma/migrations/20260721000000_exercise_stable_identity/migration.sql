-- Exercise identity must survive re-seeds: the seed now upserts each row keyed
-- by (experienceLevel, orderIndex) instead of wipe-and-recreate, so mobile
-- caches that persist Exercise ids never go stale. Replace the plain index
-- with the unique index the upsert requires.

-- DropIndex
DROP INDEX "Exercise_experienceLevel_orderIndex_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_experienceLevel_orderIndex_key" ON "Exercise"("experienceLevel", "orderIndex");
