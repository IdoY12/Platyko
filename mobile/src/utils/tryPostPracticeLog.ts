import type UserService from "@/services/auth-aware/UserService";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

export async function tryPostPracticeLog(user: UserService, seconds: number): Promise<boolean> {
  try {
    await user.postPracticeLog(getStreakCalendarDate(), seconds);
    return true;
  } catch {
    return false;
  }
}
