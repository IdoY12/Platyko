import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import UserService from "@/services/auth-aware/UserService";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import { useStudySecondsTicker } from "@/hooks/useStudySecondsTicker";
import { drainRefInt } from "@/utils/formatHelpers";
import { tryPostPracticeLog } from "@/utils/tryPostPracticeLog";

/**
 * Counts active practice seconds while a lesson exercise is on screen and posts them to the server
 * (registered users only) whenever the app backgrounds or the exercise changes.
 */
export function useLessonPracticeTime(accessToken: string | null, tracking: boolean, exerciseIndex: number) {
  const user = useAuthenticatedService(UserService);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const trackedRef = useRef(0);

  const flushPractice = useCallback(async () => {
    if (!accessTokenRef.current || trackedRef.current <= 0) return;
    const seconds = drainRefInt(trackedRef);
    const ok = await tryPostPracticeLog(user, seconds);
    if (!ok) trackedRef.current += seconds;
  }, [user]);

  useStudySecondsTicker(tracking, () => { trackedRef.current += 1; });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => { if (next !== "active") void flushPractice(); });
    return () => sub.remove();
  }, [flushPractice]);

  useEffect(() => () => { void flushPractice(); }, [exerciseIndex, flushPractice, tracking]);
}
