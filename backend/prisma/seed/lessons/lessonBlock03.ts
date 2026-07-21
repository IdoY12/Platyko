/**
 * Seeds curriculum lesson block 03 — Junior track, Functions & Arrays.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block03Exercises } from "./data/block03.js";

export async function seedLessonBlock_03(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Junior track",
    title: "Functions and array basics",
    description: "Declarations vs expressions, arrow functions, and core array methods",
    estimatedMinutes: 12,
    orderIndex: 3,
    difficulty: "JUNIOR",
    exercises: block03Exercises,
  }, order);
}
