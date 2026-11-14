import { Alert, Linking } from "react-native";
import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { setNotificationsEnabled } from "@/redux/profile-slice";
import { t } from "@/i18n/translate";

export function openExternalUrl(url: string): void {
  void Linking.openURL(url).catch(() => Alert.alert(t("settings.linkUnavailable")));
}

export function applyNotificationsToggle(
  enabled: boolean, user: UserService, dispatch: AppDispatch, setDraftNotifications: (value: boolean) => void,
  prefs: { accessToken: string | null },
): void {
  setDraftNotifications(enabled);
  dispatch(setNotificationsEnabled(enabled));
  // Guests have no server account; their preference persists locally via redux-persist.
  if (!prefs.accessToken) return;
  user.patchPreferences({ notificationsEnabled: enabled }).catch((error) => {
    logError("[PROFILE]", error, { phase: "save-notifications" });
    setDraftNotifications(!enabled);
    dispatch(setNotificationsEnabled(!enabled));
    Alert.alert(t("settings.notifications"), t("settings.notificationsFailed"));
  });
}
