import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { colors, font, fontSize } from "@/theme/theme";

const TICK_MS = 250;
const WARNING_THRESHOLD_MS = 10_000;

/** Countdown to the server round deadline; `endsAt` is device-clock epoch ms (0 = unknown, hidden). */
export function DuelRoundTimer({ endsAt }: { endsAt: number }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    setRemainingMs(Math.max(0, endsAt - Date.now()));
    if (!endsAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setRemainingMs(left);
      if (left === 0) clearInterval(interval);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const clock = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
  const nearlyUp = remainingMs <= WARNING_THRESHOLD_MS;

  return (
    <Text
      style={[styles.timer, nearlyUp && styles.timerWarning]}
      accessibilityLabel={`Round time remaining ${clock}`}
    >
      TIME {clock}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    alignSelf: "center",
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: fontSize.sm,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  timerWarning: { color: colors.duel },
});
