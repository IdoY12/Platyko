import { hydrateStreak } from "@/redux/streak-slice";
import type { AppDispatch } from "@/redux/store";
import UserService from "@/services/auth-aware/UserService";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { logError } from "@/utils/logger";

/** Fetches progress summary (runs server streak app-open) and mirrors `streakCurrent` into Redux. */
export async function syncRegisteredStreakFromServer(dispatch: AppDispatch): Promise<void> {
  try {
    const progress = await new UserService().getProgressSummary(getStreakCalendarDate());
    dispatch(
      hydrateStreak({
        streakCurrent: progress.streakCurrent,
        lastActivityDate: progress.streakLastActivityDate,
        lastCheckedDate: progress.streakLastCheckedDate,
      }),
    );
  } catch (error) {
    logError("[STREAK]", error, { phase: "sync-registered-streak" });
  }
}
