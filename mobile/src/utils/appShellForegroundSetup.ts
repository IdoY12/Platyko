import NetInfo from "@react-native-community/netinfo";
import * as Notifications from "expo-notifications";
import { ensureAppShellNotificationChannel } from "@/utils/appShellPersistence";
import { logApp, logError } from "@/utils/logger";

/** React Native's global error dispatcher; typed here because RN exposes it untyped on `globalThis`. */
type ReactNativeErrorUtils = {
  getGlobalHandler?: () => unknown;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

/** Logs every uncaught JS error, then hands it back to RN's own handler (RedBox in dev, crash in prod). */
function registerGlobalErrorHandlers(): void {
  const errorUtils = (globalThis as unknown as { ErrorUtils?: ReactNativeErrorUtils }).ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) return;
  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    logError("[APP]", error, { isFatal: Boolean(isFatal) });
    if (typeof previousHandler === "function") (previousHandler as (e: Error, f?: boolean) => void)(error, isFatal);
  });
}

function registerUnhandledRejectionLogger(): () => void {
  const logUnhandledRejection = (event: PromiseRejectionEvent) =>
    logError("[APP]", event.reason, { type: "unhandledrejection" });
  if (typeof addEventListener !== "function") return () => {};
  addEventListener("unhandledrejection", logUnhandledRejection as EventListener);
  return () => removeEventListener("unhandledrejection", logUnhandledRejection as EventListener);
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
  const unsubscribeNetInfo = NetInfo.addEventListener((state) => setIsConnected(Boolean(state.isConnected)));
  const unsubscribeUnhandledRejectionLogger = registerUnhandledRejectionLogger();
  return () => {
    unsubscribeNetInfo();
    unsubscribeUnhandledRejectionLogger();
  };
}
