import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { setNotificationsEnabled, setUserIdentity, updatePreferences, type Commitment } from "@/redux/profile-slice";
import type { CommitmentKey, GoalKey, LevelKey } from "@/types/profile.types";

export type DraftSetters = {
  setDraftGoal: (g: GoalKey) => void;
  setDraftLevel: (l: LevelKey) => void;
  setDraftCommitment: (c: CommitmentKey) => void;
  setDraftNotifications: (n: boolean) => void;
};

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

function syncDraftsFromProgress(
  setters: DraftSetters,
  goal: GoalKey,
  experienceLevel: LevelKey,
  minutes: 10 | 15 | 25,
): void {
  setters.setDraftGoal(goal);
  setters.setDraftLevel(experienceLevel);
  setters.setDraftCommitment(String(minutes) as CommitmentKey);
}

export async function fetchAndApplyProfile(
  user: UserService,
  dispatch: AppDispatch,
  setters: DraftSetters,
  isActive: () => boolean,
): Promise<void> {
  try {
    const profile = await user.getProfile();

    if (!isActive()) return;

    dispatch(
      setUserIdentity({
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      }),
    );
    // Notification preference lives on the User model, so it applies even before goal/level are set.
    dispatch(setNotificationsEnabled(profile.notificationsEnabled));
    setters.setDraftNotifications(profile.notificationsEnabled);
    const p = profile.progress;

    if (!p?.goal || !p.experienceLevel || !p.dailyCommitmentMinutes) return;

    applyProgressToStore(dispatch, p.goal, p.experienceLevel, p.dailyCommitmentMinutes, profile.notificationsEnabled);
    syncDraftsFromProgress(setters, p.goal, p.experienceLevel, p.dailyCommitmentMinutes);
  } catch (error) {
    logError("[PROFILE]", error, { phase: "load-profile" });
  }
}
