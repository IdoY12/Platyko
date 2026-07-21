/**
 * Seeds curriculum lesson block 01 — Junior track, Variables & Types.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block01Exercises } from "./data/block01.js";

export async function seedLessonBlock_01(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Junior track",
    title: "Variables, values, and types",
    description: "let/const, reassignment, typeof basics, and type coercion",
    estimatedMinutes: 12,
    orderIndex: 1,
    difficulty: "JUNIOR",
    exercises: block01Exercises,
  }, order);
}
