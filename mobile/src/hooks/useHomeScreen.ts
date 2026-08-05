import { XP_PER_CORRECT_EXERCISE } from "@project/xp-constants";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAppSelector } from "@/redux/hooks";
import { logNav } from "@/utils/logger";
import { buildStreakDotHighlights, shouldShowStreakDotRow } from "@/utils/dailyXpStreakCore";

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 22) return "Good evening";
  return "Good night";
}

export function useHomeScreen() {
  const username = useAppSelector((s) => s.profile.username);
  const level = useAppSelector((s) => s.xp.level);
  const xp = useAppSelector((s) => s.xp.xpTotal);
  const streak = useAppSelector((s) => s.streak.streakCurrent);
  const streakDotsFilled = useMemo(() => buildStreakDotHighlights(streak), [streak]);
  const streakShowsDots = shouldShowStreakDotRow(streak);
  const practiceMinutesToday = useAppSelector((s) => Math.floor(s.session.studySecondsToday / 60));
  const commitment = useAppSelector((s) => s.profile.commitment);
  const [greeting, setGreeting] = useState(() => greetingForHour(new Date().getHours()));

  useFocusEffect(
    useCallback(() => {
      setGreeting(greetingForHour(new Date().getHours()));
      const appStateSub = AppState.addEventListener("change", (next) => {
        if (next === "active") setGreeting(greetingForHour(new Date().getHours()));
      });
      return () => appStateSub.remove();
    }, []),
  );

  useEffect(() => {
    logNav("screen:enter", { screen: "HomeScreen" });
    return () => logNav("screen:leave", { screen: "HomeScreen" });
  }, []);

  const nextLevelXp = level * XP_PER_CORRECT_EXERCISE;
  const currentLevelProgress = useMemo(() => {
    const lf = (level - 1) * XP_PER_CORRECT_EXERCISE;
    return Math.min(100, ((xp - lf) / XP_PER_CORRECT_EXERCISE) * 100);
  }, [level, xp]);
  const dailyGoalMinutes = Number(commitment);
  const dailyGoalProgressPct = dailyGoalMinutes > 0 ? Math.min(100, (practiceMinutesToday / dailyGoalMinutes) * 100) : 0;

  return {
    username,
    greeting,
    level,
    xp,
    streak,
    streakDotsFilled,
    streakShowsDots,
    nextLevelXp,
    currentLevelProgress,
    practiceMinutesToday,
    dailyGoalMinutes,
    dailyGoalProgressPct,
  };
}
