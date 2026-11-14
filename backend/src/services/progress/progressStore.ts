import type { Prisma } from "@prisma/client";
import type { LearningGoals, LessonResume } from "@project/api-contract";
import {
  PRACTICE_DAYS_KEPT,
  type AttemptRecord,
  type ConceptProgress,
  type FirstAttempt,
  type LessonSession,
  type ProgressSnapshot,
} from "@project/learning-logic";
import { levelForXp } from "@project/xp-constants";

type Transaction = Prisma.TransactionClient;

export type StoredProgress = { snapshot: ProgressSnapshot; resume: LessonResume | null; goals: LearningGoals };

const END_OF_DAY = "T23:59:59.999Z";

/** Loads a user's progress from its tables into the shape the shared rules work on. Null when the user is gone. */
export async function loadProgress(tx: Transaction, userId: string): Promise<StoredProgress | null> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      xpTotal: true, streakCurrent: true, streakBest: true, streakFreezes: true, streakLastActivityDate: true,
      streakLastCheckedDate: true, jumpedTracks: true, weeklyGoalDays: true, dailyGoalLessons: true,
    },
  });
  if (!user) return null;
  const [paid, visits, completedLessons, concepts, practiceDays, resume] = await Promise.all([
    tx.itemAttempt.findMany({
      where: { userId, OR: [{ xpAwarded: { gt: 0 }, context: { not: "REVIEW" } }, { context: "MIGRATED" }] },
      distinct: ["itemId"],
      select: { itemId: true },
    }),
    tx.itemAttempt.groupBy({ by: ["itemId"], where: { userId, attemptNo: { in: [1, 3] }, context: { not: "MIGRATED" } }, _count: { _all: true } }),
    tx.lessonCompletion.findMany({ where: { userId } }),
    tx.conceptMastery.findMany({ where: { userId } }),
    tx.practiceDay.findMany({ where: { userId }, orderBy: { date: "desc" }, take: PRACTICE_DAYS_KEPT }),
    tx.lessonResume.findUnique({ where: { userId } }),
  ]);
  return {
    snapshot: {
      xpTotal: user.xpTotal,
      streak: {
        current: user.streakCurrent,
        best: user.streakBest,
        freezes: user.streakFreezes,
        lastActivityDate: user.streakLastActivityDate,
        lastCheckedDate: user.streakLastCheckedDate,
      },
      paidItemIds: paid.map((row) => row.itemId),
      timesAnswered: Object.fromEntries(visits.map((row) => [row.itemId, row._count._all])),
      completedLessons: completedLessons.map((row) => ({ lessonId: row.lessonId, flawless: row.flawless, bestAccuracy: row.bestAccuracy })),
      concepts: concepts.map(
        (row): ConceptProgress => ({
          concept: row.concept,
          score: row.score,
          recentFirstAttempts: row.recentFirstAttempts as unknown as FirstAttempt[],
          review: { repetitions: row.repetitions, intervalDays: row.intervalDays, ease: row.ease },
          dueDate: row.dueAt.toISOString().slice(0, 10),
        }),
      ),
      practiceDays: practiceDays
        .map((row) => ({ date: row.date, lessonsCompleted: row.lessonsCompleted, itemsAnswered: row.itemsAnswered, xpEarned: row.xpEarned }))
        .reverse(),
      jumpedTracks: user.jumpedTracks,
    },
    resume: resume ? { lessonId: resume.lessonId, session: resume.state as unknown as LessonSession } : null,
    goals: { weeklyGoalDays: user.weeklyGoalDays, dailyGoalLessons: user.dailyGoalLessons },
  };
}

const changed = <Row>(before: readonly Row[], after: readonly Row[]): Row[] => after.filter((row) => !before.includes(row));

/** Stores the difference between two snapshots, plus the new attempts with the XP each one earned. */
export async function saveProgress(
  tx: Transaction,
  userId: string,
  before: ProgressSnapshot,
  after: ProgressSnapshot,
  newAttempts: { attempt: AttemptRecord; xpAwarded: number }[],
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: {
      xpTotal: after.xpTotal,
      level: levelForXp(after.xpTotal),
      streakCurrent: after.streak.current,
      streakBest: after.streak.best,
      streakFreezes: after.streak.freezes,
      streakLastActivityDate: after.streak.lastActivityDate,
      streakLastCheckedDate: after.streak.lastCheckedDate,
      jumpedTracks: after.jumpedTracks,
      lastActiveAt: new Date(),
    },
  });
  if (newAttempts.length > 0) {
    await tx.itemAttempt.createMany({
      data: newAttempts.map(({ attempt, xpAwarded }) => ({
        userId,
        itemId: attempt.itemId,
        itemVersion: attempt.itemVersion,
        correct: attempt.correct,
        attemptNo: attempt.attemptNo,
        optionIndex: attempt.optionIndex,
        usedHint: attempt.usedHint,
        context: attempt.context,
        lessonId: attempt.lessonId,
        xpAwarded,
        clientAttemptId: storedAttemptId(userId, attempt.clientAttemptId),
      })),
    });
  }
  for (const concept of changed(before.concepts, after.concepts)) {
    const data = {
      score: concept.score,
      repetitions: concept.review.repetitions,
      intervalDays: concept.review.intervalDays,
      ease: concept.review.ease,
      dueAt: new Date(`${concept.dueDate ?? after.streak.lastCheckedDate ?? "1970-01-01"}${END_OF_DAY}`),
      lastReviewedAt: new Date(),
      recentFirstAttempts: concept.recentFirstAttempts,
    };
    await tx.conceptMastery.upsert({ where: { userId_concept: { userId, concept: concept.concept } }, create: { userId, concept: concept.concept, ...data }, update: data });
  }
  for (const day of changed(before.practiceDays, after.practiceDays)) {
    const data = { lessonsCompleted: day.lessonsCompleted, itemsAnswered: day.itemsAnswered, xpEarned: day.xpEarned };
    await tx.practiceDay.upsert({ where: { userId_date: { userId, date: day.date } }, create: { userId, date: day.date, ...data }, update: data });
  }
  for (const lesson of changed(before.completedLessons, after.completedLessons)) {
    const data = { bestAccuracy: lesson.bestAccuracy, flawless: lesson.flawless, lastCompletedAt: new Date() };
    await tx.lessonCompletion.upsert({ where: { userId_lessonId: { userId, lessonId: lesson.lessonId } }, create: { userId, lessonId: lesson.lessonId, ...data }, update: data });
  }
}

/** Attempt ids are unique per user: one user's id can never collide with, or block, another's. */
export function storedAttemptId(userId: string, clientAttemptId: string): string {
  return `${userId}:${clientAttemptId}`;
}
