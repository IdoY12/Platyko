/**
 * Seeds curriculum lesson block 06 — Mid track, Async & Debugging.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block06Exercises } from "./data/block06.js";

export async function seedLessonBlock_06(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Mid track",
    title: "Async flow and debugging",
    description: "Promises, async/await, try/catch, and common async pitfalls",
    estimatedMinutes: 14,
    orderIndex: 3,
    difficulty: "MID",
    exercises: block06Exercises,
  }, order);
}
