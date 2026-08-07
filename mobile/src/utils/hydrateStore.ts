import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppDispatch } from "@/redux/store";
import { hydrateSession, reconcileStudyCalendarDay, setBootstrapError, setHasHydrated } from "@/redux/session-slice";
import { hydrateProfile } from "@/redux/profile-slice";
import { hydrateXp } from "@/redux/xp-slice";
import { hydrateStreak } from "@/redux/streak-slice";
import { hydrateLesson } from "@/redux/lesson-slice";
import { hydrateStats } from "@/redux/duel-slice";
import { hydratePuzzle } from "@/redux/puzzle-slice";
import { logAuth, logError } from "@/utils/logger";
import { readSecureSessionTokens } from "@/utils/secureSessionTokens";

export const REDUX_PERSIST_KEY = "platyko-redux-store";

type PersistedReduxSnapshot = {
  session?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  xp?: Record<string, unknown>;
  streak?: Record<string, unknown>;
  lesson?: Record<string, unknown>;
  duel?: Record<string, unknown>;
  puzzle?: Record<string, unknown>;
};

export async function hydrateStoreFromStorage(dispatch: AppDispatch): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REDUX_PERSIST_KEY);

    if (!raw) return;

    const parsed = JSON.parse(raw) as PersistedReduxSnapshot;

    if (!parsed.profile || !parsed.session) return;

    const secure = await readSecureSessionTokens();
    const sessionWithTokens = { ...parsed.session, accessToken: secure.accessToken, refreshToken: secure.refreshToken };
    dispatch(hydrateSession(sessionWithTokens as never));
    dispatch(hydrateProfile(parsed.profile as never));
    if (parsed.xp) dispatch(hydrateXp(parsed.xp as never));
    if (parsed.streak) dispatch(hydrateStreak(parsed.streak as never));
    if (parsed.lesson) dispatch(hydrateLesson(parsed.lesson as never));
    if (parsed.duel) dispatch(hydrateStats(parsed.duel as never));
    if (parsed.puzzle) dispatch(hydratePuzzle(parsed.puzzle as never));
  } catch (error) {
    logError("[APP]", error, { phase: "hydrate-redux" });
    dispatch(setBootstrapError("Could not access your stored credentials. Please log in again."));
  } finally {
    dispatch(reconcileStudyCalendarDay());
    dispatch(setHasHydrated(true));
    logAuth("storage:hydrated", { value: true });
  }
}
