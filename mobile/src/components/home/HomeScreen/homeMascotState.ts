import { isStreakAtRisk, type StreakState } from "@project/streak-logic";
import type { MascotState } from "@/components/mascot/mascotStates";

const NIGHT_STARTS_AT_HOUR = 23;
const NIGHT_ENDS_AT_HOUR = 5;
const EVENING_STARTS_AT_HOUR = 18;

/**
 * The mascot on Home reflects the streak (PRD 13.4, 13.5): asleep late at night, peeking from its
 * burrow in the evening when the streak would end tonight, waving on the first visit of the day,
 * otherwise idle. It never guilt-trips: hiding is curiosity, not sadness.
 */
export function homeMascotState(now: Date, streak: StreakState, today: string, firstVisitToday: boolean): MascotState {
  const hour = now.getHours();
  if (hour >= NIGHT_STARTS_AT_HOUR || hour < NIGHT_ENDS_AT_HOUR) return "sleep";
  if (hour >= EVENING_STARTS_AT_HOUR && isStreakAtRisk(streak, today)) return "hide";
  return firstVisitToday ? "wave" : "idle";
}

/** The seven calendar dates of the week containing `today`; the week starts on Monday, or on Sunday where that is the custom. */
export function weekDates(today: string, firstDay: "monday" | "sunday" = "monday"): string[] {
  const date = new Date(`${today}T12:00:00Z`);
  const offset = firstDay === "sunday" ? date.getUTCDay() : (date.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_unused, index) => {
    const day = new Date(date);
    day.setUTCDate(date.getUTCDate() - offset + index);
    return day.toISOString().slice(0, 10);
  });
}
