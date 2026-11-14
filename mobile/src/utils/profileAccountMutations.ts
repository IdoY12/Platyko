import { usernameValidationError } from "@project/user-credentials";
import { Alert } from "react-native";
import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { localizedError, localizedMessage } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { logError } from "@/utils/logger";
import { setUserIdentity } from "@/redux/profile-slice";
import { updateTokens } from "@/redux/session-slice";
import { discardLocalAccount } from "@/utils/resetStoresAfterLogout";

export async function updateUsername(
  user: UserService,
  name: string,
  dispatch: AppDispatch,
  onDone: () => void,
): Promise<void> {
  const trimmed = name.trim();
  const uerr = usernameValidationError(trimmed);
  if (uerr) {
    Alert.alert(t("settings.editUsername"), localizedMessage(uerr));
    return;
  }
  try {
    const updated = await user.patchUsername(trimmed);
    dispatch(setUserIdentity({ username: updated.username }));
    onDone();
  } catch (error) {
    logError("[PROFILE]", error, { phase: "update-username" });
    Alert.alert(t("settings.editUsername"), localizedError(error));
  }
}

export async function changePasswordRequest(
  user: UserService,
  currentPassword: string,
  newPassword: string,
  dispatch: AppDispatch,
  onSuccess: () => void,
): Promise<void> {
  try {
    const { accessToken, refreshToken } = await user.changePassword(currentPassword, newPassword);
    dispatch(updateTokens({ accessToken, refreshToken }));
    onSuccess();
  } catch (error) {
    logError("[PROFILE]", error, { phase: "change-password" });
    Alert.alert(t("settings.changePassword"), localizedError(error));
  }
}

export async function deleteAccountRequest(
  user: UserService,
  dispatch: AppDispatch,
  onClose: () => void,
): Promise<void> {
  try {
    await user.deleteAccount();
    await discardLocalAccount(dispatch);
    onClose();
  } catch (error) {
    logError("[PROFILE]", error, { phase: "delete-account" });
    Alert.alert(t("settings.deleteAccount"), t("errors.generic"));
  }
}
