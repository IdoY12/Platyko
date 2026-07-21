/**
 * Seeds curriculum lesson block 08 — Senior track, Performance & Memory.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block08Exercises } from "./data/block08.js";

export async function seedLessonBlock_08(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Senior track",
    title: "Performance and memory",
    description: "Event loop, microtasks, memory leaks, debounce, throttle, and memoization",
    estimatedMinutes: 16,
    orderIndex: 2,
    difficulty: "SENIOR",
    exercises: block08Exercises,
  }, order);
}
