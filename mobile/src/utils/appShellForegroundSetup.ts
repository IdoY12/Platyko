import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { ensureAppShellNotificationChannel } from "@/utils/appShellPersistence";
import { logApp, logError } from "@/utils/logger";

/** React Native's global error dispatcher; typed here because RN exposes it untyped on `globalThis`. */
type ReactNativeErrorUtils = {
  getGlobalHandler?: () => unknown;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let globalErrorHandlerInstalled = false;

/**
 * Logs every uncaught JS error, then hands it back to RN's own handler (RedBox in dev, crash in prod).
 * Installed once per JS runtime: the error boundary's Restart remounts the shell, not the runtime.
 */
function registerGlobalErrorHandlers(): void {
  const errorUtils = (globalThis as unknown as { ErrorUtils?: ReactNativeErrorUtils }).ErrorUtils;
  if (globalErrorHandlerInstalled || !errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) return;
  globalErrorHandlerInstalled = true;
  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    logError("[APP]", error, { isFatal: Boolean(isFatal) });
    if (typeof previousHandler === "function") (previousHandler as (e: Error, f?: boolean) => void)(error, isFatal);
  });
}

type HermesRejectionTracker = { enablePromiseRejectionTracker?: (options: { allRejections: boolean; onUnhandled: (id: number, reason: unknown) => void }) => void };

/** Hermes has no `unhandledrejection` event; its own tracker is the only hook, and RN wires it in dev builds only. */
function registerUnhandledRejectionLogger(): void {
  if (__DEV__) return;
  const hermes = (globalThis as { HermesInternal?: HermesRejectionTracker }).HermesInternal;
  hermes?.enablePromiseRejectionTracker?.({ allRejections: true, onUnhandled: (_id, reason) => logError("[APP]", reason, { type: "unhandledrejection" }) });
}

export function attachAppShellForegroundInfrastructure(setIsConnected: (next: boolean) => void): () => void {
  logApp("launch");
  registerGlobalErrorHandlers();
  void ensureAppShellNotificationChannel();
  // Intentionally permanent for the app's lifetime — Expo provides no teardown API for this.
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
  });
  registerUnhandledRejectionLogger();
  return NetInfo.addEventListener((state) => setIsConnected(Boolean(state.isConnected)));
}
