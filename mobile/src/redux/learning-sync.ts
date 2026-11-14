import { getStreakCalendarDate } from "@/utils/streakCalendar";
import ProgressService from "@/services/auth-aware/ProgressService";
import ContentService from "@/services/auth-aware/ContentService";
import { logError } from "@/utils/logger";
import type { AppDispatch, RootState } from "./store";
import { applyServerProgress, setContentMap } from "./learning-slice";

let syncInFlight: Promise<void> | null = null;

/**
 * Sends the queued attempts and finished lessons of a registered learner, then takes the
 * server's progress. Runs at most once at a time; on failure the queue stays and the next
 * trigger (a finished lesson, the app returning to the foreground, the network returning)
 * tries again. Guests keep everything on the device until they sign up.
 */
export function syncLearningProgress(dispatch: AppDispatch, getState: () => RootState): Promise<void> {
  if (syncInFlight) return syncInFlight;
  const { session, learning } = getState();
  if (!session.isAuthenticated || session.isGuest) return Promise.resolve();
  const attempts = learning.pendingAttempts.map((pending) => pending.attempt);
  const completedLessons = learning.pendingLessons.map((pending) => pending.lesson);
  const service = new ProgressService();
  const request =
    attempts.length > 0 || completedLessons.length > 0
      ? service.submit({ clientLocalDate: getStreakCalendarDate(), attempts, completedLessons })
      : service.getProgress(getStreakCalendarDate());
  syncInFlight = request
    .then((response) => {
      dispatch(
        applyServerProgress({
          response,
          sentAttemptIds: attempts.map((attempt) => attempt.clientAttemptId),
          sentLessonIds: completedLessons.map((lesson) => lesson.lessonId),
        }),
      );
    })
    .catch((error: unknown) => logError("[LEARN]", error, { phase: "sync-progress" }))
    .finally(() => {
      syncInFlight = null;
    });
  return syncInFlight;
}

/** Refreshes the skill map; the cached copy stays in use when the network is down. */
export async function refreshContentMap(dispatch: AppDispatch): Promise<void> {
  try {
    dispatch(setContentMap(await new ContentService().getMap()));
  } catch (error) {
    logError("[LEARN]", error, { phase: "refresh-map" });
  }
}
