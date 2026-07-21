/**
 * Prisma seed orchestrator: duel wipe, curriculum + code puzzle upserts.
 *
 * Responsibility: run ordered seed steps in one transaction (a mid-seed crash
 * must never leave content tables empty or partial) and disconnect Prisma.
 * Layer: backend prisma seed
 * Consumers: prisma CLI via package.json script
 */

import { PrismaClient } from "@prisma/client";
import { injectDatabaseUrlFromConfig } from "@project/db";
import { persistDuelQuestions } from "./duel/persistDuelQuestions.js";
import { runAllLessonBlocks } from "./lessons/runAllLessonBlocks.js";
import { seedCleanup } from "./seedCleanup.js";
import { seedCodePuzzles } from "./codePuzzles.js";

injectDatabaseUrlFromConfig();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await seedCleanup(tx);
      await runAllLessonBlocks(tx);
      await persistDuelQuestions(tx);
      await seedCodePuzzles(tx);
    },
    { timeout: 120_000 },
  );
  console.log("Seed complete: exercises, duel questions, code puzzles.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
