/**
 * Shared mapper from lean duel-question seeds to Prisma create-many rows.
 *
 * Responsibility: stamp every seed as an MCQ row (the only duel question type).
 * Layer: backend prisma seed
 * Depends on: @prisma/client types
 * Consumers: duelCoercionQuestions.ts, duelRuntimeQuestions.ts
 */

import type { Prisma } from "@prisma/client";

export type DuelQuestionSeed = Pick<
  Prisma.DuelQuestionCreateManyInput,
  "questionText" | "codeSnippet" | "correctAnswer" | "options" | "explanation"
>;

export function buildDuelQuestions(seeds: DuelQuestionSeed[]): Prisma.DuelQuestionCreateManyInput[] {
  return seeds.map((seed) => ({ ...seed, type: "MCQ" }));
}
