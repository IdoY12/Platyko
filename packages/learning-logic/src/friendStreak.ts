import { calendarDaysBetweenEarlierAndLater } from "@project/streak-logic";

/** A learner keeps a Friend Streak with at most this many friends at once (PRD 11.1). */
export const FRIEND_STREAK_LIMIT = 5;

/**
 * A Friend Streak (PRD 11.1): the run of consecutive days on which both friends practised, with no
 * joint activity needed. Like a personal streak it is still alive on a day neither has practised
 * yet, so it ends today or yesterday; any older run counts as 0. Dates are "YYYY-MM-DD".
 */
export function friendStreakDays(ownDays: readonly string[], friendDays: readonly string[], today: string): number {
  const theirs = new Set(friendDays);
  const shared = [...new Set(ownDays)].filter((day) => theirs.has(day) && day <= today).sort().reverse();
  if (shared.length === 0 || calendarDaysBetweenEarlierAndLater(shared[0], today) > 1) return 0;
  let length = 1;
  while (length < shared.length && calendarDaysBetweenEarlierAndLater(shared[length], shared[length - 1]) === 1) length += 1;
  return length;
}
