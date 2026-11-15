import { creditLeagueXp, prisma, runSerializableWithRetry } from "@project/db";
import type { ProgressResponse, SubmitProgressRequest, SubmitProgressResponse } from "@project/api-contract";
import { applyAttempt, applyDailyChallenge, applyLessonCompletion, levelOf, type AttemptRecord, type ProgressSnapshot } from "@project/learning-logic";
import { streakOnAppOpen, trustedCalendarDate } from "@project/streak-logic";
import { knownLessonIds } from "../content/contentCatalog.js";
import { withPassedJumpTests } from "./jumpTestPass.js";
import { recordAchievements } from "./recordAchievements.js";
import { loadProgress, saveProgress, storedAttemptId, type StoredProgress } from "./progressStore.js";

const toResponse = (stored: StoredProgress, snapshot: ProgressSnapshot): ProgressResponse => ({
  progress: snapshot,
  level: levelOf(snapshot),
  resume: stored.resume,
  goals: stored.goals,
});

/**
 * Applies a batch of attempts and finished lessons to a user's progress with the shared rules,
 * in one serialisable transaction. Attempts already stored, or for items the bank does not
 * hold, are skipped; the XP is always computed here and never taken from the client.
 */
export async function submitProgress(userId: string, request: SubmitProgressRequest): Promise<SubmitProgressResponse | null> {
  const lessonIds = await knownLessonIds();
  return runSerializableWithRetry(prisma, async (tx) => {
    const stored = await loadProgress(tx, userId);
    if (!stored) return null;
    const today = trustedCalendarDate(request.clientLocalDate, stored.snapshot.streak.lastActivityDate);

    const submittedIds = request.attempts.map((attempt) => storedAttemptId(userId, attempt.clientAttemptId));
    const [alreadyStored, items] = await Promise.all([
      tx.itemAttempt.findMany({ where: { clientAttemptId: { in: submittedIds } }, select: { clientAttemptId: true } }),
      tx.item.findMany({ where: { id: { in: request.attempts.map((attempt) => attempt.itemId) } }, select: { id: true, concept: true, version: true } }),
    ]);
    const storedIds = new Set(alreadyStored.map((row) => row.clientAttemptId));
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const seen = new Set<string>();
    const fresh = request.attempts
      .filter((attempt) => {
        const id = storedAttemptId(userId, attempt.clientAttemptId);
        if (storedIds.has(id) || seen.has(id) || !itemsById.has(attempt.itemId)) return false;
        seen.add(id);
        return true;
      })
      .sort((left, right) => (left.answeredAt < right.answeredAt ? -1 : left.answeredAt > right.answeredAt ? 1 : left.attemptNo - right.attemptNo));

    let snapshot = stored.snapshot;
    let xpEarned = 0;
    const recorded: { attempt: AttemptRecord; xpAwarded: number }[] = [];
    for (const attempt of fresh) {
      const item = itemsById.get(attempt.itemId)!;
      const applied = applyAttempt(snapshot, { ...attempt, itemVersion: item.version }, item.concept, today);
      snapshot = applied.snapshot;
      xpEarned += applied.xpEarned;
      recorded.push({ attempt: { ...attempt, itemVersion: item.version }, xpAwarded: applied.xpEarned });
    }
    // A finished lesson always arrives with new attempts from it; one that does not is a re-sent batch.
    const playedLessonIds = new Set(fresh.map((attempt) => attempt.lessonId));
    const finishedLessons = request.completedLessons.filter((completed) => lessonIds.has(completed.lessonId) && playedLessonIds.has(completed.lessonId));
    for (const lesson of finishedLessons) {
      const applied = applyLessonCompletion(snapshot, lesson, today);
      snapshot = applied.snapshot;
      xpEarned += applied.xpEarned;
    }

    // A challenge counts only with its answers in the same batch and never for a future day.
    const answeredChallenge = fresh.some((attempt) => attempt.context === "DAILY_CHALLENGE");
    for (const challenge of request.dailyChallenges.filter((result) => answeredChallenge && result.date <= today)) {
      const applied = applyDailyChallenge(snapshot, challenge, today);
      snapshot = applied.snapshot;
      xpEarned += applied.xpEarned;
    }
    snapshot = await withPassedJumpTests(tx, userId, snapshot, fresh);
    await saveProgress(tx, userId, stored.snapshot, snapshot, recorded);
    await recordAchievements(tx, userId, snapshot);
    await creditLeagueXp(tx, userId, xpEarned, today);
    const finishedResume = stored.resume !== null && finishedLessons.some((lesson) => lesson.lessonId === stored.resume?.lessonId);
    if (finishedResume) await tx.lessonResume.delete({ where: { userId } });
    return { ...toResponse({ ...stored, resume: finishedResume ? null : stored.resume }, snapshot), xpEarned };
  });
}

/** Reads a user's progress; opening the app also settles the streak for the days since the last visit. */
export async function readProgress(userId: string, clientLocalDate: string | undefined): Promise<ProgressResponse | null> {
  return runSerializableWithRetry(prisma, async (tx) => {
    const stored = await loadProgress(tx, userId);
    if (!stored) return null;
    if (!clientLocalDate) return toResponse(stored, stored.snapshot);
    const today = trustedCalendarDate(clientLocalDate, stored.snapshot.streak.lastActivityDate);
    const snapshot = { ...stored.snapshot, streak: streakOnAppOpen(stored.snapshot.streak, today) };
    await saveProgress(tx, userId, stored.snapshot, snapshot, []);
    return toResponse(stored, snapshot);
  });
}
