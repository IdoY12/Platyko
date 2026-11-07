import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppDispatch } from "@/redux/store";
import { REDUX_PERSIST_KEY } from "@/utils/hydrateStore";
import { signOut } from "@/redux/session-slice";
import { resetProfile, setNotificationsEnabled } from "@/redux/profile-slice";
import { resetXp } from "@/redux/xp-slice";
import { resetStreak } from "@/redux/streak-slice";
import { resetLesson } from "@/redux/lesson-slice";
import { resetStats } from "@/redux/duel-slice";
import { resetPuzzle } from "@/redux/puzzle-slice";
import { duelReset } from "@/redux/duel-live-slice";
import { clearSecureSessionTokens } from "@/utils/secureSessionTokens";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";

export function resetStoresAfterLogout(dispatch: AppDispatch): void {
  void clearSecureSessionTokens();
  dispatch(signOut());
  dispatch(resetProfile());
  // A logged-out device must not keep the 19:00 reminder; the guest toggle can re-enable it.
  dispatch(setNotificationsEnabled(false));
  dispatch(resetXp());
  dispatch(resetStreak());
  dispatch(resetLesson());
  dispatch(resetStats());
  dispatch(resetPuzzle());
  dispatch(duelReset());
  void syncDailyPracticeReminder();
}

/** The server says this account is gone (401, deleted): drop the on-disk snapshot too, then reset. */
export async function discardLocalAccount(dispatch: AppDispatch): Promise<void> {
  await AsyncStorage.removeItem(REDUX_PERSIST_KEY);
  resetStoresAfterLogout(dispatch);
}
