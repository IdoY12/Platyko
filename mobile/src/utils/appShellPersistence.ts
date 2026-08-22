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
import { logError } from "@/utils/logger";
import { isAuthFailure } from "@/utils/bootstrapSession";

export function subscribeStoreToHybridStorage(appStore: typeof store): () => void {
  let previousSerialized = "";
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = appStore.subscribe(() => {
    const state = appStore.getState();
    const sessionForDisk = { ...state.session, accessToken: null as string | null, refreshToken: null as string | null };
    const serialized = JSON.stringify({
      session: sessionForDisk,
      profile: state.profile,
      xp: state.xp,
      streak: state.streak,
      lesson: state.lesson,
      duel: state.duel,
      puzzle: state.puzzle,
    });
    if (serialized === previousSerialized) return;
    previousSerialized = serialized;
    void writeSecureSessionTokens(state.session.accessToken, state.session.refreshToken);
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => { void AsyncStorage.setItem(REDUX_PERSIST_KEY, serialized); writeTimer = null; }, 500);
  });
  return () => { if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; } unsubscribe(); };
}

/** * Setup the notification "office": run once at startup (AppShell) to ensure the 
 * infrastructure is ready before any actual reminders are sent. 
 */
export async function ensureAppShellNotificationSetup(): Promise<void> {
  // Android 8+ requirement: Build a specific "track" (channel) for our notifications. 
  // Without this track, Android won't know how to handle the "trains" (notifications) we send.
  if (Platform.OS === "android") {
    // Define the "practice-reminders" track; you MUST use this exact ID later when scheduling.
    await Notifications.setNotificationChannelAsync("practice-reminders", {
      // The user-facing name in Android settings (e.g., "Practice Reminders").
      name: "Practice reminders",
      // Set the volume/vibration level: DEFAULT means it makes sound but doesn't "scream" at the user.
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Ask the Operating System (iOS/Android) for the current status. 
  // Even if this code runs every time the app opens, the OS remembers the user's 
  // previous choice (Granted/Denied) so we don't have to guess.
  const permission = await Notifications.getPermissionsAsync();

  // If not already "granted", show the one-time system popup to the user.
  // Note: If they previously said "No", the OS will silently block this prompt for us.
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    await Notifications.requestPermissionsAsync();
  }
}

export async function refreshSessionOrLogoutOnForeground(accessToken: string, dispatch: AppDispatch): Promise<void> {
  try {
    const me = await new UserService().getMe();
    dispatch(setUserIdentity({ email: me.email, username: me.username, avatarUrl: me.avatarUrl ?? null }));
  } catch (error) {
    if (isAuthFailure(error)) {
      await AsyncStorage.removeItem(REDUX_PERSIST_KEY);
      await clearSecureSessionTokens();
      resetStoresAfterLogout(dispatch);
    }
  }
}

// Define the "Internal Whistleblower": Tell TypeScript what RN’s hidden ErrorUtils looks like.
// It’s the "Emergency Dispatcher" that RN uses to manage crashes.
type ReactNativeErrorUtils = {
  // "Who is the dispatcher right now?" - RN uses this to see the current error handler.
  getGlobalHandler?: () => unknown;
  // "Install a new dispatcher" - RN calls this when a JS error "explodes" and no one caught it.
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

// Setup the "Black Box" (Flight Recorder): This function wires the guards for uncaught errors.
// It doesn't need parameters because it just "plugs in" the recorder once at startup.
export function registerGlobalErrorHandlers(): void {
  // Find RN’s internal "Dispatcher" (ErrorUtils) in the global memory. 
  // We use `unknown` because TS doesn't "see" it by default, but we know RN put it there.
  const reactNativeErrorUtils = (globalThis as unknown as { ErrorUtils?: ReactNativeErrorUtils }).ErrorUtils;
  
  // "Heartbeat Check": If this device or environment doesn't have the Dispatcher, 
  // stop here so we don't cause a crash while trying to setup the crash-logger.
  if (!reactNativeErrorUtils?.getGlobalHandler || !reactNativeErrorUtils?.setGlobalHandler) return;
  
  // Backup the "Original Guard": Remember what RN was planning to do when disasters hit.
  // We’ll need this to let the app finish its crash properly after we finish journaling.
  const previousGlobalErrorHandler = reactNativeErrorUtils.getGlobalHandler();
  
  // Install our "Spy": From now on, when trouble hits, don't just crash — run our code first.
  reactNativeErrorUtils.setGlobalHandler((error, isFatal) => {
    // Our Step: Pause and write to the "Journal" (Log) exactly what went wrong.
    // We include the "isFatal" flag so we know if the app is about to close (Fatal = "קטלני").
    logError("[APP]", error, { isFatal: Boolean(isFatal) });
    
    // After journaling, hand the "Baton" back to the original guard.
    // This ensures the app still shows the RedBox (in dev) or crashes cleanly (in prod).
    if (typeof previousGlobalErrorHandler === "function")
      (previousGlobalErrorHandler as (e: Error, f?: boolean) => void)(error, isFatal);
  });
}

export function registerUnhandledRejectionLogger(): () => void {
  // 1. Define what to do when a "leak" (unhandled promise) is detected.
  const logUnhandledRejection = (event: PromiseRejectionEvent) => {
    // We take the reason (the error message) and send it to our journal.
    logError("[APP]", event.reason, { type: "unhandledrejection" });
  };

  // 2. Safety check: does this phone/browser support global event listening?
  if (typeof addEventListener !== "function") return () => {};

  // 3. Subscription: "Dear System, if ANY promise fails without a catch, run my function."
  addEventListener("unhandledrejection", logUnhandledRejection as EventListener);

  // 4. Return the "Cancel" button: useAppShell will call this to stop listening.
  return () => removeEventListener("unhandledrejection", logUnhandledRejection as EventListener);
}