/**
 * Seeds curriculum lesson block 04 — Mid track, Objects & Classes.
 *
 * Responsibility: isolated lesson createMany for maintainability under file line limits.
 * Layer: backend prisma seed
 * Depends on: ../lib/createLessonWithExercises.js
 * Consumers: runAllLessonBlocks.ts
 */

import type { Prisma } from "@prisma/client";
import { createLessonWithExercises } from "../lib/createLessonWithExercises.js";
import type { GlobalExerciseOrder } from "../lib/createLessonWithExercises.js";

import { block04Exercises } from "./data/block04.js";

export async function seedLessonBlock_04(prisma: Prisma.TransactionClient, order: GlobalExerciseOrder): Promise<void> {
  await createLessonWithExercises(prisma, {
    chapterTitle: "Mid track",
    title: "Objects, classes, and `this`",
    description: "Constructors, methods, this, inheritance with extends, and super",
    estimatedMinutes: 14,
    orderIndex: 1,
    difficulty: "MID",
    exercises: block04Exercises,
  }, order);
}
