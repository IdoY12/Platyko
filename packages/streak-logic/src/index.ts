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
