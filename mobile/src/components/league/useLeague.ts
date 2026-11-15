import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { LeagueResponse } from "@project/api-contract";
import { useAppSelector } from "@/redux/hooks";
import LeagueService from "@/services/auth-aware/LeagueService";
import { logError } from "@/utils/logger";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

/** The learner's league this week, reloaded whenever the screen showing it comes into focus; null for a guest or while loading. */
export function useLeague(): { league: LeagueResponse | null; reload: () => void } {
  const isAuthenticated = useAppSelector((state) => state.session.isAuthenticated);
  const [league, setLeague] = useState<LeagueResponse | null>(null);
  const reload = useCallback(() => {
    if (!isAuthenticated) return;
    new LeagueService().getCurrent(getStreakCalendarDate()).then(setLeague, (error: unknown) => logError("[LEAGUE]", error, { phase: "load" }));
  }, [isAuthenticated]);
  useFocusEffect(reload);
  return { league: isAuthenticated ? league : null, reload };
}
