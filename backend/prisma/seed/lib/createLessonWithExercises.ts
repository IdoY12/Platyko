/**
 * Upserts flat curriculum exercises (no Lesson/Chapter tables).
 *
 * Responsibility: seed helper for lesson blocks; assigns global order per
 * experience level and upserts each exercise keyed by (experienceLevel,
 * orderIndex) so ids stay stable across re-seeds.
 * Layer: backend prisma seed
 * Depends on: seedExerciseTypes.ts, @prisma/client
 * Consumers: seed/lessons/*.ts
 */

import type { ExperienceLevel, Prisma } from "@prisma/client";
import type { SeedExercise } from "./seedExerciseTypes.js";

export type GlobalExerciseOrder = Record<ExperienceLevel, number>;

export function createGlobalOrderCounters(): GlobalExerciseOrder {
  return { JUNIOR: 0, MID: 0, SENIOR: 0 };
}

export async function createLessonWithExercises(
  prisma: Prisma.TransactionClient,
  params: {
    chapterTitle: string;
    title: string;
    description: string;
    estimatedMinutes: number;
    orderIndex: number;
    difficulty: ExperienceLevel;
    exercises: SeedExercise[];
  },
  order: GlobalExerciseOrder,
): Promise<void> {
  void params.estimatedMinutes;
  void params.orderIndex;
  void params.description;
  const experienceLevel = params.difficulty;
  const sectionLabel = `${params.chapterTitle} — ${params.title}`;

  await params.exercises.reduce<Promise<void>>(async (prev, exercise) => {
    await prev;
    const idx = order[experienceLevel];
    order[experienceLevel] += 1;
    const content = {
      sectionLabel,
      type: exercise.type,
      prompt: exercise.prompt,
      codeSnippet: exercise.codeSnippet,
      correctAnswer: exercise.correctAnswer,
      explanation: exercise.explanation,
    };
    // Upsert keyed by (experienceLevel, orderIndex) so an exercise keeps its id
    // across re-seeds — mobile installs cache ids and submit against them.
    const persisted = await prisma.exercise.upsert({
      where: { experienceLevel_orderIndex: { experienceLevel, orderIndex: idx } },
      update: content,
      create: { experienceLevel, orderIndex: idx, ...content },
    });

    await prisma.exerciseOption.deleteMany({ where: { exerciseId: persisted.id } });
    if (exercise.options && exercise.options.length > 0) {
      await prisma.exerciseOption.createMany({
        data: exercise.options.map((option) => ({
          exerciseId: persisted.id,
          text: option,
          isCorrect: option === exercise.correctAnswer,
        })),
      });
    }
  }, Promise.resolve());
}
