import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { setNotificationsEnabled, identityOf, setUserIdentity, updatePreferences, type Commitment } from "@/redux/profile-slice";
import type { GoalKey, LevelKey } from "@/types/profile.types";


function applyProgressToStore(
  dispatch: AppDispatch,
  goal: GoalKey,
  experienceLevel: LevelKey,
  minutes: 10 | 15 | 25,
  notificationsEnabled: boolean,
): void {
  dispatch(
    updatePreferences({
      goal,
      experienceLevel,
      commitment: String(minutes) as Commitment,
      notificationsEnabled,
    }),
  );
}

export async function fetchAndApplyProfile(
  user: UserService,
  dispatch: AppDispatch,
  setDraftNotifications: (enabled: boolean) => void,
  isActive: () => boolean,
): Promise<void> {
  try {
    const profile = await user.getProfile();

    if (!isActive()) return;

    dispatch(setUserIdentity(identityOf(profile)));
    // Notification preference lives on the User model, so it applies even before goal/level are set.
    dispatch(setNotificationsEnabled(profile.notificationsEnabled));
    setDraftNotifications(profile.notificationsEnabled);
    const p = profile.progress;

    if (!p?.goal || !p.experienceLevel || !p.dailyCommitmentMinutes) return;

    applyProgressToStore(dispatch, p.goal, p.experienceLevel, p.dailyCommitmentMinutes, profile.notificationsEnabled);
  } catch (error) {
    logError("[PROFILE]", error, { phase: "load-profile" });
  }
}
