/**
 * Deletes existing curriculum, duel, and code puzzle rows before re-seeding.
 *
 * Responsibility: ordered wipe of CONTENT tables only so FK constraints remain
 * satisfied. Must never touch user-owned data (User, UserProgress, DuelSession,
 * RefreshToken) — re-seeding in production must not destroy user state.
 * Layer: backend prisma seed
 * Depends on: @prisma/client
 * Consumers: runMain.ts
 */

import type { PrismaClient } from "@prisma/client";

export async function seedCleanup(prisma: PrismaClient): Promise<void> {
  await prisma.exerciseOption.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.duelQuestion.deleteMany();
  await prisma.codePuzzle.deleteMany();
}
