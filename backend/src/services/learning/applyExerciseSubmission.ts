import { ensureProgressRow, handleStreakQualifyingXpForUser, prisma, runSerializableWithRetry, type DbClient } from "@project/db";
import { normaliseExerciseAnswer } from "@project/exercise-answer";
import { levelFromXpTotal, MAX_XP_TOTAL, XP_PER_CORRECT_EXERCISE } from "@project/xp-constants";
import type { ExerciseSubmitResponseDto } from "../../dto/exerciseSubmitResponseDto.js";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

type SubmitInput = {
  userId: string;
  exerciseId: string;
  answer: string;
  /** Client local calendar date (YYYY-MM-DD) for streak; required when persisting qualifying XP. */
  clientLocalDate?: string;
};

export async function applyExerciseSubmission(input: SubmitInput): Promise<ExerciseSubmitResponseDto | null> {
  const exercise = await prisma.exercise.findUnique({ where: { id: input.exerciseId } });

  if (!exercise) return null;
  const isCorrect =
    normaliseExerciseAnswer(input.answer) === normaliseExerciseAnswer(exercise.correctAnswer);

  let streakCurrent: number | undefined;

  if (isCorrect) {
    await runSerializableWithRetry(prisma, async (tx: DbClient) => {
      await ensureProgressRow(tx, input.userId, exercise.experienceLevel);
      const progress = await tx.userProgress.findUnique({
        where: {
          userId_experienceLevel: { userId: input.userId, experienceLevel: exercise.experienceLevel },
        },
      });

      if (!progress) return;

      const nextXp = Math.min(progress.xpTotal + XP_PER_CORRECT_EXERCISE, MAX_XP_TOTAL);
      const nextIdx = Math.max(progress.currentExerciseIndex, exercise.orderIndex + 1);
      const updated = await tx.userProgress.update({
        where: { id: progress.id },
        data: { xpTotal: nextXp, level: levelFromXpTotal(nextXp), currentExerciseIndex: nextIdx },
      });
      if (input.clientLocalDate && dateKeyRegex.test(input.clientLocalDate)) {
        streakCurrent = await handleStreakQualifyingXpForUser(
          tx,
          input.userId,
          input.clientLocalDate,
          XP_PER_CORRECT_EXERCISE,
        );
      } else {
        streakCurrent = updated.streakCurrent;
      }
    });
  }

  return {
    xpEarned: isCorrect ? XP_PER_CORRECT_EXERCISE : 0,
    explanation: exercise.explanation,
    ...(streakCurrent !== undefined ? { streakCurrent } : {}),
  };
}
