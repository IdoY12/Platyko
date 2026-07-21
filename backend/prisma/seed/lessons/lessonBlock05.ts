/**
 * Seeds curriculum lesson block 05 — Mid track, Collections & Patterns.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block05Exercises } from "./data/block05.js";

export async function seedLessonBlock_05(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Mid track",
    title: "Maps, sets, and array patterns",
    description: "Map, Set, WeakMap, spread, rest, destructuring, and reduce",
    estimatedMinutes: 14,
    orderIndex: 2,
    difficulty: "MID",
    exercises: block05Exercises,
  }, order);
}
