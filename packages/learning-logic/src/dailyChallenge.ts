import { XP_REWARDS } from "@project/xp-constants";
import { streakOnActivity } from "@project/streak-logic";
import type { MapUnit } from "./skillMap.js";
import { withPracticeDay, type ProgressSnapshot } from "./progress.js";

/**
 * The daily challenge (PRD 5.1 L8, 6.8): five items a day, one attempt each, from lessons the
 * learner has finished (a newcomer gets the first lessons of the map). The day picks the items,
 * so the same learner sees the same five all day. Finishing pays its XP once per day; the result
 * is kept as a grid of squares that does not reveal the questions (PRD 14.4).
 */

export const DAILY_CHALLENGE_LENGTH = 5;
/** Results kept on the snapshot: enough for the Home card and a month of history. */
const DAILY_RESULTS_KEPT = 31;
const DAILY_PREFIX = "daily:";

export type DailyChallengeResult = {
  /** The learner's calendar date, YYYY-MM-DD. */
  date: string;
  /** Right at the single attempt, in the order the items were shown. */
  grid: boolean[];
};

export function dailyChallengeId(date: string): string {
  return `${DAILY_PREFIX}${date}`;
}

/** The date of a daily-challenge id, or null for any other lesson id. */
export function dailyChallengeDate(lessonId: string): string | null {
  const date = lessonId.startsWith(DAILY_PREFIX) ? lessonId.slice(DAILY_PREFIX.length) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/** A stable 32-bit hash (FNV-1a): the same date and item always sort the same way. */
function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** The day's items: from finished teaching lessons, topped up from the first lessons of the map. */
export function dailyChallengeItemIds(map: readonly MapUnit[], completedLessonIds: ReadonlySet<string>, date: string): string[] {
  const teaching = map.flatMap((unit) => unit.lessons.filter((lesson) => lesson.concept !== null));
  const finished = teaching.filter((lesson) => completedLessonIds.has(lesson.id)).flatMap((lesson) => lesson.itemIds);
  const pool = finished.length >= DAILY_CHALLENGE_LENGTH ? finished : [...new Set([...finished, ...teaching.slice(0, 2).flatMap((lesson) => lesson.itemIds)])];
  return [...pool].sort((left, right) => hashOf(`${date}:${left}`) - hashOf(`${date}:${right}`)).slice(0, DAILY_CHALLENGE_LENGTH);
}

/** Applies a finished challenge: its XP and the streak the first time that day, nothing on a repeat. */
export function applyDailyChallenge(snapshot: ProgressSnapshot, result: DailyChallengeResult, today: string): { snapshot: ProgressSnapshot; xpEarned: number } {
  if (snapshot.dailyChallenges.some((earlier) => earlier.date === result.date)) return { snapshot, xpEarned: 0 };
  const xpEarned = XP_REWARDS.dailyChallenge;
  return {
    xpEarned,
    snapshot: {
      ...snapshot,
      xpTotal: snapshot.xpTotal + xpEarned,
      dailyChallenges: [...snapshot.dailyChallenges, result].sort((left, right) => (left.date < right.date ? -1 : 1)).slice(-DAILY_RESULTS_KEPT),
      practiceDays: withPracticeDay(snapshot.practiceDays, today, { xpEarned }),
      streak: streakOnActivity(snapshot.streak, today),
    },
  };
}
