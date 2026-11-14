import { prisma, runSerializableWithRetry } from "@project/db";
import type { GuestProgressUpload, SubmitProgressResponse } from "@project/api-contract";
import { applyAttempt, applyLessonCompletion, EMPTY_PROGRESS, levelOf, type ProgressSnapshot } from "@project/learning-logic";
import { trustedCalendarDate, type StreakState } from "@project/streak-logic";
import { knownLessonIds } from "../content/contentCatalog.js";
import { withPassedJumpTests } from "./jumpTestPass.js";
import { loadProgress, saveProgress, storedAttemptId } from "./progressStore.js";

/** A guest's attempt keeps its own day (so past practice days and the guest's streak are rebuilt), never a future one. */
function attemptDate(answeredAt: string, today: string): string {
  const day = answeredAt.slice(0, 10);
  return day > today ? today : day;
}

/** The streak still alive today: one whose last activity is today or yesterday. */
function isLive(streak: StreakState, today: string): boolean {
  if (streak.lastActivityDate === null) return false;
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return streak.lastActivityDate >= yesterday.toISOString().slice(0, 10);
}

/** The higher of the two live streaks, and the higher best (PRD 10.2). */
function mergedStreak(account: StreakState, guest: StreakState, today: string): StreakState {
  const accountCurrent = isLive(account, today) ? account.current : 0;
  const guestCurrent = isLive(guest, today) ? guest.current : 0;
  const winner = guestCurrent > accountCurrent ? guest : account;
  return { ...winner, best: Math.max(account.best, guest.best), freezes: Math.max(account.freezes, guest.freezes) };
}

/**
 * Brings a guest's device history into the account they signed in to, by any method (PRD 10.2,
 * 20.4). Only attempts arrive, never an XP number: the server recomputes XP with the shared
 * rules, so an item already done on the account pays nothing again. Completed items are the
 * union of both, and the streak is the higher of the two live ones.
 */
export async function mergeGuestProgress(userId: string, upload: GuestProgressUpload): Promise<SubmitProgressResponse | null> {
  const lessonIds = await knownLessonIds();
  return runSerializableWithRetry(prisma, async (tx) => {
    const stored = await loadProgress(tx, userId);
    if (!stored) return null;
    const today = trustedCalendarDate(upload.clientLocalDate, null);

    const submittedIds = upload.attempts.map((attempt) => storedAttemptId(userId, attempt.clientAttemptId));
    const [alreadyStored, items] = await Promise.all([
      tx.itemAttempt.findMany({ where: { clientAttemptId: { in: submittedIds } }, select: { clientAttemptId: true } }),
      tx.item.findMany({ where: { id: { in: [...new Set(upload.attempts.map((attempt) => attempt.itemId))] } }, select: { id: true, concept: true, version: true } }),
    ]);
    const storedIds = new Set(alreadyStored.map((row) => row.clientAttemptId));
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const fresh = upload.attempts
      .filter((attempt) => itemsById.has(attempt.itemId) && !storedIds.has(storedAttemptId(userId, attempt.clientAttemptId)))
      .sort((left, right) => (left.answeredAt < right.answeredAt ? -1 : 1));
    const lastDayOfLesson = new Map(fresh.map((attempt) => [attempt.lessonId, attemptDate(attempt.answeredAt, today)]));

    let account = stored.snapshot;
    let guest: ProgressSnapshot = EMPTY_PROGRESS;
    let xpEarned = 0;
    const recorded = [];
    for (const attempt of fresh) {
      const item = itemsById.get(attempt.itemId)!;
      const versioned = { ...attempt, itemVersion: item.version };
      const day = attemptDate(attempt.answeredAt, today);
      const applied = applyAttempt(account, versioned, item.concept, day);
      account = applied.snapshot;
      xpEarned += applied.xpEarned;
      guest = applyAttempt(guest, versioned, item.concept, day).snapshot;
      recorded.push({ attempt: versioned, xpAwarded: applied.xpEarned });
    }
    for (const lesson of upload.completedLessons.filter((completed) => lessonIds.has(completed.lessonId) && lastDayOfLesson.has(completed.lessonId))) {
      const day = lastDayOfLesson.get(lesson.lessonId) ?? today;
      const applied = applyLessonCompletion(account, lesson, day);
      account = applied.snapshot;
      xpEarned += applied.xpEarned;
      guest = applyLessonCompletion(guest, lesson, day).snapshot;
    }
    account = { ...account, streak: mergedStreak(stored.snapshot.streak, guest.streak, today) };
    account = await withPassedJumpTests(tx, userId, account, fresh);

    await saveProgress(tx, userId, stored.snapshot, account, recorded);
    return { progress: account, level: levelOf(account), resume: stored.resume, goals: stored.goals, xpEarned };
  });
}
