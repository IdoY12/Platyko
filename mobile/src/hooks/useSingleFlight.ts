import { useCallback, useRef } from "react";

/**
 * Runs an async action at most once at a time. A ref, unlike a `loading` state, also stops two taps
 * that land in the same frame (before React re-renders the disabled button).
 */
export function useSingleFlight() {
  const busyRef = useRef(false);
  return useCallback(async (task: () => Promise<void>): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await task();
    } finally {
      busyRef.current = false;
    }
  }, []);
}
