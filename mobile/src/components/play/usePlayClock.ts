import { useEffect, useState } from "react";

const TICK_MS = 250;

/**
 * Milliseconds left until a server deadline, counted on this device. The deadline is read once,
 * when the countdown appears, and never allowed above `longestMs`, so a phone clock that runs
 * ahead or behind the server's cannot show more time than the round has. The server alone
 * decides when the round is over.
 */
export function usePlayClock(deadline: number, longestMs: number): number {
  const [localDeadline] = useState(() => Date.now() + Math.min(Math.max(deadline - Date.now(), 0), longestMs));
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return Math.max(localDeadline - now, 0);
}
