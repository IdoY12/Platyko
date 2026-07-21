/**
 * Deletes existing duel content rows before re-seeding.
 *
 * Responsibility: ordered wipe of CONTENT tables only so FK constraints remain
 * satisfied. Must never touch user-owned data (User, UserProgress, DuelSession,
 * RefreshToken) — re-seeding in production must not destroy user state.
 * CodePuzzle and Exercise rows are NOT wiped: their ids key per-user state
 * (puzzleXpSolveCounts, mobile exercise caches), so codePuzzles.ts and
 * createLessonWithExercises.ts upsert them in place instead.
 * Layer: backend prisma seed
 * Depends on: @prisma/client
 * Consumers: runMain.ts
 */

import type { Prisma } from "@prisma/client";

export async function seedCleanup(prisma: Prisma.TransactionClient): Promise<void> {
  await prisma.duelQuestion.deleteMany();
}
