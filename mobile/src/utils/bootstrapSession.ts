import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppDispatch } from "@/redux/store";
import store from "@/redux/store";
import UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { setAuthChecked, setBootstrapError } from "@/redux/session-slice";
import { setNotificationsEnabled, setUserIdentity, updatePreferences, type Commitment } from "@/redux/profile-slice";
import { hydrateXp } from "@/redux/xp-slice";
import { hydrateStreak } from "@/redux/streak-slice";
import { hydrateStats } from "@/redux/duel-slice";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { REDUX_PERSIST_KEY } from "@/utils/hydrateStore";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";

function isBootstrapServerError(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return typeof status === "number" && status >= 500 && status < 600;
}

export function isAuthFailure(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

let _inflight: Promise<void> | null = null;

export function bootstrapSession(dispatch: AppDispatch): Promise<void> {
  if (_inflight) return _inflight;
  _inflight = _run(dispatch).finally(() => { _inflight = null; });
  return _inflight;
}

async function _run(dispatch: AppDispatch): Promise<void> {
  const token = store.getState().session.accessToken;
  const isAuthed = store.getState().session.isAuthenticated;

  if (!isAuthed) { dispatch(setAuthChecked(true)); return; }
  // Signed in on disk but the keychain is empty: drop the account's local copy so it can never be
  // migrated as "guest progress" into someone else's sign-up.
  if (!token) { resetStoresAfterLogout(dispatch); return; }

  const userService = new UserService();

  try {
    dispatch(setBootstrapError(null));
    const me = await userService.getMe();
    dispatch(setUserIdentity({ email: me.email, username: me.username, avatarUrl: me.avatarUrl ?? null, hasPassword: me.hasPassword, authProvider: me.authProvider }));
    const userPreferences = await userService.getPreferencesGet();
    // Notification preference lives on the User model, so it applies even before goal/level are set.
    dispatch(setNotificationsEnabled(userPreferences.notificationsEnabled));

    if (userPreferences.userGoal && userPreferences.dailyGoalMinutes) {
      dispatch(updatePreferences({
        goal: userPreferences.userGoal,
        experienceLevel: userPreferences.experienceLevel,
        commitment: String(userPreferences.dailyGoalMinutes) as Commitment,
        notificationsEnabled: userPreferences.notificationsEnabled,
      }));
    }

    const progress = await userService.getProgressSummary(getStreakCalendarDate());
    dispatch(hydrateXp({ xpTotal: progress.xpTotal, level: progress.level }));
    dispatch(hydrateStreak({ streakCurrent: progress.streakCurrent, lastActivityDate: progress.streakLastActivityDate, lastCheckedDate: progress.streakLastCheckedDate }));
    dispatch(hydrateStats({ duelWins: progress.duelWins, duelLosses: progress.duelLosses, lessonsCompleted: progress.lessonsCompleted }));
  } catch (error) {
    logError("[AUTH]", error, { phase: "bootstrap" });
    if (isBootstrapServerError(error)) {
      dispatch(setBootstrapError("We could not load your account data because the server had a problem. You are still signed in. Tap Retry to try again."));
    } else if (isAuthFailure(error)) {
      await AsyncStorage.removeItem(REDUX_PERSIST_KEY);
      resetStoresAfterLogout(dispatch);
    } else {
      dispatch(setBootstrapError("Could not reach the server. Check your connection and tap Retry."));
    }
  } finally {
    dispatch(setAuthChecked(true));
  }
}
