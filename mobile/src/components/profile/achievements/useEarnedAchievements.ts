import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAppSelector } from "@/redux/hooks";
import { earnedAchievementCodes } from "@/redux/learning-selectors";
import UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";

/**
 * Every badge the learner holds (PRD 14.2): those their learning earns, computed here, and for an
 * account those the server recorded from games and Friend Streaks, read each time the view opens.
 */
export function useEarnedAchievements(): Set<string> {
  const { map, progress } = useAppSelector((state) => state.learning);
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const [recorded, setRecorded] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      new UserService().getAchievements().then(setRecorded, (error: unknown) => logError("[PROFILE]", error, { phase: "achievements" }));
    }, [isGuest]),
  );
  return useMemo(() => new Set([...earnedAchievementCodes(progress, map), ...recorded]), [map, progress, recorded]);
}
