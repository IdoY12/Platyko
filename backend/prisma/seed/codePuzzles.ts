/**
 * Seeds all code puzzle rows from the canonical puzzle list.
 *
 * Responsibility: upsert every CodePuzzle row keyed by orderIndex so ids stay
 * stable across re-seeds (per-user puzzleXpSolveCounts key on puzzle id), then
 * prune rows removed from the seed list. Runs serially: the transaction client
 * shares one connection.
 * Layer: backend prisma seed
 * Depends on: @prisma/client, codePuzzleSeed.shard*
 * Consumers: runMain.ts
 */

import type { Prisma } from "@prisma/client";
import { CODE_PUZZLE_SHARD_0 } from "./codePuzzleSeed.shard0.js";
import { CODE_PUZZLE_SHARD_1 } from "./codePuzzleSeed.shard1.js";
import { CODE_PUZZLE_SHARD_2 } from "./codePuzzleSeed.shard2.js";

const puzzles = [...CODE_PUZZLE_SHARD_0, ...CODE_PUZZLE_SHARD_1, ...CODE_PUZZLE_SHARD_2];

export async function seedCodePuzzles(prisma: Prisma.TransactionClient): Promise<void> {
  for (const puzzle of puzzles) {
    await prisma.codePuzzle.upsert({
      where: { orderIndex: puzzle.orderIndex },
      update: { prompt: puzzle.prompt, acceptedAnswers: puzzle.acceptedAnswers, testCases: puzzle.testCases },
      create: puzzle,
    });
  }
  await prisma.codePuzzle.deleteMany({ where: { orderIndex: { notIn: puzzles.map((p) => p.orderIndex) } } });
}
