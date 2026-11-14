/**
 * Shared pure streak rules.
 * Used by mobile UI helpers and by server/io persistence — single source for rule math.
 */

/** Gap in streak units that triggers a reset or restart (gap >= 2 means one unit was skipped). */
const STREAK_RESET_THRESHOLD = 2;

/** YYYY-MM-DD, the only calendar-date shape clients may send. */
export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DailyXpStreakPersisted = {
  streakCount: number;
  lastActivityDate: string | null;
  lastCheckedDate: string | null;
};

export function calendarDaysBetweenEarlierAndLater(earlierDateOnly: string, laterDateOnly: string): number {
  return (new Date(laterDateOnly).getTime() - new Date(earlierDateOnly).getTime()) / 86_400_000;
}

/**
 * Server-side guard for a client-supplied calendar date: a device may legitimately sit a day away
 * from UTC, anything further is replaced by the server's date, and a date before the last recorded
 * activity can never rewind the streak (so alternating dates cannot farm it).
 */
export function trustedCalendarDate(clientDate: string, lastActivityDate: string | null, now = new Date()): string {
  const serverDate = now.toISOString().slice(0, 10);
  const driftDays = Math.abs(calendarDaysBetweenEarlierAndLater(serverDate, clientDate));
  const candidate = driftDays <= 1 ? clientDate : serverDate;
  return lastActivityDate !== null && candidate < lastActivityDate ? lastActivityDate : candidate;
}

/** Guest snapshots arrive from the client: a date after tomorrow (server UTC) is pulled back to tomorrow. */
export function noLaterThanTomorrow(date: string, now = new Date()): string {
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  return date > tomorrow ? tomorrow : date;
}

export function applyStreakOnAppOpen(state: DailyXpStreakPersisted, today: string): DailyXpStreakPersisted {
  const missedAppOpenDay =
    state.lastCheckedDate !== null && calendarDaysBetweenEarlierAndLater(state.lastCheckedDate, today) >= STREAK_RESET_THRESHOLD;
  const missedExerciseDay =
    state.lastActivityDate !== null && calendarDaysBetweenEarlierAndLater(state.lastActivityDate, today) >= STREAK_RESET_THRESHOLD;
  const streakCount = missedAppOpenDay || missedExerciseDay ? 0 : state.streakCount;
  return {
    streakCount,
    lastActivityDate: state.lastActivityDate,
    lastCheckedDate: today,
  };
}

export function applyStreakOnQualifyingXp(state: DailyXpStreakPersisted, today: string): DailyXpStreakPersisted {
  if (state.lastActivityDate === today) return state;
  if (state.lastActivityDate === null) {
    return {
      streakCount: 1,
      lastActivityDate: today,
      lastCheckedDate: today,
    };
  }
  const gap = calendarDaysBetweenEarlierAndLater(state.lastActivityDate, today);
  if (gap >= STREAK_RESET_THRESHOLD) {
    return {
      streakCount: 1,
      lastActivityDate: today,
      lastCheckedDate: today,
    };
  }
  return {
    streakCount: state.streakCount + 1,
    lastActivityDate: today,
    lastCheckedDate: today,
  };
}

/**
 * Streak with freezes (PRD 6.8): one qualifying action a day extends the streak; a freeze is
 * earned at every seventh consecutive day, at most two are held, and a held freeze covers a
 * missed day automatically. The best streak is never rewritten by a freeze or a reset.
 */
export type StreakState = {
  current: number;
  best: number;
  freezes: number;
  lastActivityDate: string | null;
  lastCheckedDate: string | null;
};

export const EMPTY_STREAK: StreakState = { current: 0, best: 0, freezes: 0, lastActivityDate: null, lastCheckedDate: null };

export const STREAK_DAYS_PER_FREEZE = 7;
export const MAX_STREAK_FREEZES = 2;

/** Days with no activity between the last active day and `today` (0 when active yesterday). */
function missedDays(lastActivityDate: string, today: string): number {
  return Math.max(0, calendarDaysBetweenEarlierAndLater(lastActivityDate, today) - 1);
}

/** Opening the app: a gap the held freezes cannot cover ends the streak; a covered gap keeps it. */
export function streakOnAppOpen(state: StreakState, today: string): StreakState {
  if (state.lastActivityDate === null) return { ...state, lastCheckedDate: today };
  const missed = missedDays(state.lastActivityDate, today);
  const current = missed > state.freezes ? 0 : state.current;
  return { ...state, current, lastCheckedDate: today };
}

/** A qualifying action: extends the streak once per day, spending freezes for the days missed. */
export function streakOnActivity(state: StreakState, today: string): StreakState {
  if (state.lastActivityDate === today) return state;
  if (state.lastActivityDate !== null && today < state.lastActivityDate) return state;
  const missed = state.lastActivityDate === null ? 0 : missedDays(state.lastActivityDate, today);
  const covered = state.lastActivityDate !== null && state.current > 0 && missed <= state.freezes;
  const current = covered ? state.current + 1 : 1;
  const freezesLeft = covered ? state.freezes - missed : state.freezes;
  const earned = current % STREAK_DAYS_PER_FREEZE === 0 ? 1 : 0;
  return {
    current,
    best: Math.max(state.best, current),
    freezes: Math.min(MAX_STREAK_FREEZES, freezesLeft + earned),
    lastActivityDate: today,
    lastCheckedDate: today,
  };
}

/** True when the streak ends tonight unless the learner practises: no activity today and no freeze to cover it. */
export function isStreakAtRisk(state: StreakState, today: string): boolean {
  return state.current > 0 && state.lastActivityDate !== today && state.freezes === 0;
}
