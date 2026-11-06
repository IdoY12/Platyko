import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAppDispatch } from "@/redux/hooks";
import { addStudySeconds } from "@/redux/session-slice";

/**
 * Adds one study second per second while `active` and the app is in the foreground (lesson, puzzle,
 * duel). `onTick` lets a caller also count the seconds for its own purpose (server practice log).
 */
export function useStudySecondsTicker(active: boolean, onTick?: () => void): void {
  const dispatch = useAppDispatch();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => { appStateRef.current = next; });
    if (!active) return () => sub.remove();
    const timer = setInterval(() => {
      if (appStateRef.current !== "active") return;
      dispatch(addStudySeconds(1));
      onTickRef.current?.();
    }, 1000);
    return () => { clearInterval(timer); sub.remove(); };
  }, [active, dispatch]);
}
