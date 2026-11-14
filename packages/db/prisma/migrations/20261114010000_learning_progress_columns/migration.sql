-- Columns the learning API needs on top of the redesign models: the evidence behind a mastery
-- score, tracks opened by a jump test, concept-card traces, and the loaded bank's identity.
ALTER TABLE "ConceptMastery" ADD COLUMN "recentFirstAttempts" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "User" ADD COLUMN "jumpedTracks" "Track"[] DEFAULT ARRAY[]::"Track"[];

ALTER TABLE "ContentUnit" ADD COLUMN "conceptCardTraces" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "ContentBank" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bankHash" TEXT NOT NULL,
    "verificationRunId" TEXT,
    "loadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentBank_pkey" PRIMARY KEY ("id")
);
