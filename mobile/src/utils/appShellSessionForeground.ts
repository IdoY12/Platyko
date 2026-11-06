import type { MutableRefObject } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { reconcileStudyCalendarDay } from "@/redux/session-slice";
import { runStreakAppOpen } from "@/redux/streak-slice";
import type { AppDispatch } from "@/redux/store";
import store from "@/redux/store";
import { refreshSessionOrLogoutOnForeground } from "@/utils/appShellPersistence";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";
import { syncRegisteredStreakFromServer } from "@/utils/syncRegisteredStreakFromServer";

export function attachAppShellSessionForegroundSync(
  appStateRef: MutableRefObject<AppStateStatus>,
  dispatch: AppDispatch,
): () => void {
  const sub = AppState.addEventListener("change", (next) => {
    if (appStateRef.current !== "active" && next === "active") {
      dispatch(reconcileStudyCalendarDay());
      const { accessToken, isAuthenticated, isGuest } = store.getState().session;
      if (isAuthenticated && accessToken && !store.getState().duelLive.sessionId) {
        void refreshSessionOrLogoutOnForeground(dispatch);
        void syncRegisteredStreakFromServer(dispatch);
      }
      if (isGuest) dispatch(runStreakAppOpen({ today: getStreakCalendarDate() }));
      void syncDailyPracticeReminder();
    }
    appStateRef.current = next;
  });
  return () => sub.remove();
}
