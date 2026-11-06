import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAppDispatch } from "@/redux/hooks";
import { addStudySeconds } from "@/redux/session-slice";
import UserService from "@/services/auth-aware/UserService";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import { drainRefInt } from "@/utils/formatHelpers";
import { tryPostPracticeLog } from "@/utils/tryPostPracticeLog";

/**
 * Counts active practice seconds while a lesson exercise is on screen and in the foreground, and
 * posts them to the server (registered users only) whenever the app backgrounds or the exercise changes.
 */
export function useLessonPracticeTime(accessToken: string | null, tracking: boolean, exerciseIndex: number) {
  const dispatch = useAppDispatch();
  const user = useAuthenticatedService(UserService);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const trackedRef = useRef(0);

  const flushPractice = useCallback(async () => {
    if (!accessTokenRef.current || trackedRef.current <= 0) return;
    const seconds = drainRefInt(trackedRef);
    const ok = await tryPostPracticeLog(user, seconds);
    if (!ok) trackedRef.current += seconds;
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appStateRef.current === "active" && next !== "active") void flushPractice();
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [flushPractice]);

  useEffect(() => {
    if (!tracking) return;
    const t = setInterval(() => {
      if (appStateRef.current === "active") {
        trackedRef.current += 1;
        dispatch(addStudySeconds(1));
      }
    }, 1000);
    return () => {
      clearInterval(t);
      void flushPractice();
    };
  }, [dispatch, exerciseIndex, flushPractice, tracking]);
}
