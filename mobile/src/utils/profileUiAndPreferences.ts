import { Alert, Linking } from "react-native";
import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { setNotificationsEnabled, updatePreferences } from "@/redux/profile-slice";
import type { CommitmentKey, GoalKey, LevelKey, StatItem } from "@/types/profile.types";

type StatsSource = { streakCurrent: number; xp: number; lessonsCompleted: number };

export function profileStatsFromRedux(r: StatsSource): StatItem[] {
  return [
    { icon: "fire", label: "Streak", value: `${r.streakCurrent}d` },
    { icon: "lightning-bolt", label: "XP", value: String(r.xp) },
    { icon: "book-open-variant", label: "Lessons", value: String(r.lessonsCompleted) },
  ];
}

export function profileInitials(username: string): string {
  return (username || "C").trim().charAt(0).toUpperCase();
}

export function openExternalUrl(url: string): void {
  void Linking.openURL(url).catch(() => Alert.alert("Unavailable", "Could not open this link right now."));
}

export function applyNotificationsToggle(
  enabled: boolean, user: UserService | null, dispatch: AppDispatch, setDraftNotifications: (value: boolean) => void,
  prefs: { accessToken: string | null },
): void {
  setDraftNotifications(enabled);
  dispatch(setNotificationsEnabled(enabled));
  // Guests have no server account; their preference persists locally via redux-persist.
  if (!user || !prefs.accessToken) return;
  user.patchPreferences({ notificationsEnabled: enabled }).catch((error) => {
    logError("[PROFILE]", error, { phase: "save-notifications" });
    setDraftNotifications(!enabled);
    dispatch(setNotificationsEnabled(!enabled));
    Alert.alert("Notifications", "Could not update notifications right now.");
  });
}

export async function patchLearningSettings(
  user: UserService,
  draftGoal: GoalKey,
  draftLevel: LevelKey,
  draftCommitment: CommitmentKey,
  draftNotifications: boolean,
  dispatch: AppDispatch,
  setSaveMessage: (m: string | null) => void,
): Promise<void> {
  try {
    const response = await user.patchPreferences({
      goal: draftGoal,
      experienceLevel: draftLevel,
      dailyCommitmentMinutes: Number(draftCommitment),
      notificationsEnabled: draftNotifications,
    });
    dispatch(
      updatePreferences({
        goal: response.goal ?? draftGoal,
        experienceLevel: response.experienceLevel,
        commitment: String(response.dailyCommitmentMinutes) as CommitmentKey,
        notificationsEnabled: response.notificationsEnabled,
      }),
    );
    dispatch(setNotificationsEnabled(response.notificationsEnabled));
    setSaveMessage("Preferences updated.");
  } catch (error) {
    logError("[AUTH]", error, { phase: "save-preferences" });
    setSaveMessage("Could not save preferences right now.");
  }
}
