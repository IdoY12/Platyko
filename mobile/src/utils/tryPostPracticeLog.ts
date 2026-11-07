import type UserService from "@/services/auth-aware/UserService";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { logError } from "@/utils/logger";

export async function tryPostPracticeLog(user: UserService, seconds: number): Promise<boolean> {
  try {
    await user.postPracticeLog(getStreakCalendarDate(), seconds);
    return true;
  } catch (error) {
    logError("[TASKS]", error, { phase: "practice-log" });
    return false;
  }
}
