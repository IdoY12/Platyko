/**
 * Seeds curriculum lesson block 02 — Junior track, Operators & Loops.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block02Exercises } from "./data/block02.js";

export async function seedLessonBlock_02(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Junior track",
    title: "Operators, conditionals, and loops",
    description: "Comparisons, if/else, for and while loops, break and continue",
    estimatedMinutes: 12,
    orderIndex: 2,
    difficulty: "JUNIOR",
    exercises: block02Exercises,
  }, order);
}
