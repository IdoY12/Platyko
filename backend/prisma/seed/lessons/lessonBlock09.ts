/**
 * Seeds curriculum lesson block 09 — Senior track, Concurrency & Advanced Patterns.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block09Exercises } from "./data/block09.js";

export async function seedLessonBlock_09(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Senior track",
    title: "Concurrency and advanced patterns",
    description: "Promise combinators, generators, Symbol, Proxy, currying, and Reflect",
    estimatedMinutes: 16,
    orderIndex: 3,
    difficulty: "SENIOR",
    exercises: block09Exercises,
  }, order);
}
