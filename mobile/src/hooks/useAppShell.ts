import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { QueryClient } from "@tanstack/react-query";
import { attachAppShellForegroundInfrastructure } from "@/utils/appShellForegroundSetup";
import { attachAppShellSessionForegroundSync } from "@/utils/appShellSessionForeground";
import store from "@/redux/store";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { bootstrapSession } from "@/utils/bootstrapSession";
import { hydrateStoreFromStorage } from "@/utils/hydrateStore";
import { runStreakAppOpen } from "@/redux/streak-slice";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { logAuth } from "@/utils/logger";
import { subscribeStoreToHybridStorage } from "@/utils/appShellPersistence";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";
import { setBootstrapError } from "@/redux/session-slice";

export const appQueryClient = new QueryClient();

export function useAppShell() {
  const dispatch = useAppDispatch();
  const bootstrapError = useAppSelector((s) => s.session.bootstrapError);
  const [isConnected, setIsConnected] = useState(true);
  const hasHydrated = useAppSelector((s) => s.session.hasHydrated);
  const isAuthenticated = useAppSelector((s) => s.session.isAuthenticated);
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const commitment = useAppSelector((s) => s.profile.commitment);
  const notificationsEnabled = useAppSelector((s) => s.profile.notificationsEnabled);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const retryBootstrap = useCallback(() => {
    dispatch(setBootstrapError(null));
    void bootstrapSession(dispatch);
  }, [dispatch]);

  useEffect(() => attachAppShellForegroundInfrastructure(setIsConnected), []);

  useEffect(() => {
    void hydrateStoreFromStorage(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (!hasHydrated) return;
    // Read the token from the store directly: it is only logged here, and selecting
    // it would re-run this bootstrap effect on every token refresh.
    logAuth("bootstrap:start", { isAuthenticated, hasAccessToken: Boolean(store.getState().session.accessToken) });
    if (isGuest) dispatch(runStreakAppOpen({ today: getStreakCalendarDate() }));
    void bootstrapSession(dispatch);
  }, [dispatch, hasHydrated, isAuthenticated, isGuest]);

  useEffect(() => {
    if (!hasHydrated) return;
    return subscribeStoreToHybridStorage(store);
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    void syncDailyPracticeReminder();
  }, [hasHydrated, isGuest, isAuthenticated, commitment, notificationsEnabled]);

  useEffect(() => {
    if (!hasHydrated) return;
    return attachAppShellSessionForegroundSync(appStateRef, dispatch);
  }, [hasHydrated, dispatch]);

  return { isConnected, bootstrapError, retryBootstrap };
}
