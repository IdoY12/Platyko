/**
 * Seeds curriculum lesson block 07 — Senior track, Architecture & Patterns.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block07Exercises } from "./data/block07.js";

export async function seedLessonBlock_07(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Senior track",
    title: "Architecture and design patterns",
    description: "Singleton, Observer, SOLID principles, DI, Factory, and module patterns",
    estimatedMinutes: 16,
    orderIndex: 1,
    difficulty: "SENIOR",
    exercises: block07Exercises,
  }, order);
}
