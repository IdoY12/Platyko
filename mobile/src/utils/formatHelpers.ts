import { Alert } from "react-native";
import { t } from "@/i18n/translate";

export function duelQueueRejectMessage(reason: string): string {
  if (reason === "already_in_duel") {
    return "Your account is already in a duel on another device. Finish that duel on the other device, then try again.";
  }
  if (reason === "superseded_by_other_device") {
    return "You started matchmaking on another device signed in with this account. This search was cancelled.";
  }
  return "Session expired. Please log out and back in to play duels.";
}

export function guardDuelAccess(isGuest: boolean, onAuth: () => void, onAllowed: () => void): void {
  if (!isGuest) {
    onAllowed();
    return;
  }
  Alert.alert(t("auth.duelsNeedAccountTitle"), t("auth.duelsNeedAccountBody"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("auth.signInOrRegister"), onPress: onAuth },
  ]);
}
