import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type store from "@/redux/store";
import type { AppDispatch } from "@/redux/store";
import UserService from "@/services/auth-aware/UserService";
import { setUserIdentity } from "@/redux/profile-slice";
import { REDUX_PERSIST_KEY } from "@/utils/hydrateStore";
import { clearSecureSessionTokens, writeSecureSessionTokens } from "@/utils/secureSessionTokens";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";
import { isAuthFailure } from "@/utils/bootstrapSession";

/**
 * Mirrors Redux to disk: tokens go to SecureStore the moment they change (every sign-in, refresh
 * and re-login), everything else to AsyncStorage with the tokens zeroed out, debounced 500 ms.
 */
export function subscribeStoreToHybridStorage(appStore: typeof store): () => void {
  let previousSnapshot = "";
  let previousTokens = "";
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = appStore.subscribe(() => {
    const state = appStore.getState();
    const tokens = `${state.session.accessToken ?? ""}|${state.session.refreshToken ?? ""}`;
    if (tokens !== previousTokens) {
      previousTokens = tokens;
      void writeSecureSessionTokens(state.session.accessToken, state.session.refreshToken);
    }
    const sessionForDisk = { ...state.session, accessToken: null as string | null, refreshToken: null as string | null };
    const snapshot = JSON.stringify({
      session: sessionForDisk,
      profile: state.profile,
      xp: state.xp,
      streak: state.streak,
      lesson: state.lesson,
      duel: state.duel,
      puzzle: state.puzzle,
    });
    if (snapshot === previousSnapshot) return;
    previousSnapshot = snapshot;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => { void AsyncStorage.setItem(REDUX_PERSIST_KEY, snapshot); writeTimer = null; }, 500);
  });
  return () => { if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; } unsubscribe(); };
}

/**
 * Android 8+ needs the notification channel to exist before anything is scheduled on it. This never
 * prompts the user: the permission dialog is requested by syncDailyPracticeReminder, right when a
 * reminder is about to be scheduled (after onboarding, with notifications switched on).
 */
export async function ensureAppShellNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("practice-reminders", {
    name: "Practice reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function refreshSessionOrLogoutOnForeground(accessToken: string, dispatch: AppDispatch): Promise<void> {
  try {
    const me = await new UserService().getMe();
    dispatch(setUserIdentity({ email: me.email, username: me.username, avatarUrl: me.avatarUrl ?? null, hasPassword: me.hasPassword, authProvider: me.authProvider }));
  } catch (error) {
    if (isAuthFailure(error)) {
      await AsyncStorage.removeItem(REDUX_PERSIST_KEY);
      await clearSecureSessionTokens();
      resetStoresAfterLogout(dispatch);
    }
  }
}
