import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import store from "@/redux/store";
import type { AppDispatch } from "@/redux/store";
import UserService from "@/services/auth-aware/UserService";
import { identityOf, setUserIdentity } from "@/redux/profile-slice";
import { REDUX_PERSIST_KEY } from "@/utils/hydrateStore";
import { persistTokens } from "@/utils/secureSessionTokens";
import { logError } from "@/utils/logger";
import { discardLocalAccount } from "@/utils/resetStoresAfterLogout";
import { isAuthFailure } from "@/utils/bootstrapSession";

/**
 * Mirrors Redux to disk: tokens go to SecureStore the moment they change (every sign-in, refresh
 * and re-login), everything else to AsyncStorage with the tokens zeroed out, debounced 500 ms.
 * Boot flags and the curriculum/puzzle session caches are left out so every launch re-checks
 * the session and re-fetches content (server-side content fixes reach installed apps).
 */
export function subscribeStoreToHybridStorage(appStore: typeof store): () => void {
  let previousSnapshot = "";
  // Seeded with what hydration produced: subscribing must never "write back" an unread (null) pair over the keychain.
  let previousTokens = `${appStore.getState().session.accessToken ?? ""}|${appStore.getState().session.refreshToken ?? ""}`;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  const writeNow = () => { if (writeTimer) clearTimeout(writeTimer); writeTimer = null; void AsyncStorage.setItem(REDUX_PERSIST_KEY, previousSnapshot); };
  // A guest's last answer lives only on this device: never lose it to a kill inside the debounce window.
  const background = AppState.addEventListener("change", (next) => { if (next !== "active" && writeTimer) writeNow(); });
  const unsubscribe = appStore.subscribe(() => {
    const state = appStore.getState();
    const tokens = `${state.session.accessToken ?? ""}|${state.session.refreshToken ?? ""}`;
    if (tokens !== previousTokens) {
      previousTokens = tokens;
      persistTokens(state.session.accessToken, state.session.refreshToken);
    }
    const snapshot = JSON.stringify({
      session: { ...state.session, accessToken: null, refreshToken: null, hasHydrated: false, authChecked: false, bootstrapError: null },
      profile: state.profile,
      xp: state.xp,
      streak: state.streak,
      lesson: { ...state.lesson, exercisesByExperienceLevel: {} },
      duel: state.duel,
      puzzle: { ...state.puzzle, allPuzzles: null },
    });
    if (snapshot === previousSnapshot) return;
    previousSnapshot = snapshot;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(writeNow, 500);
  });
  return () => { if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; } background.remove(); unsubscribe(); };
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

export async function refreshSessionOrLogoutOnForeground(dispatch: AppDispatch): Promise<void> {
  try {
    const me = await new UserService().getMe();
    dispatch(setUserIdentity(identityOf(me)));
  } catch (error) {
    if (isAuthFailure(error)) await discardLocalAccount(dispatch);
    else logError("[AUTH]", error, { phase: "foreground-sync" });
  }
}
