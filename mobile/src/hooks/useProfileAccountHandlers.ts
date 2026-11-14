import React from "react";
import { passwordPolicyError } from "@project/user-credentials";
import { Alert } from "react-native";
import { useAppDispatch } from "@/redux/hooks";
import { useSingleFlight } from "@/hooks/useSingleFlight";
import type UserService from "@/services/auth-aware/UserService";
import { resetLearning } from "@/redux/learning-slice";
import { changePasswordRequest, deleteAccountRequest, updateUsername } from "@/utils/profileAccountMutations";
import { confirmLogout } from "@/utils/confirmLogout";
import { t } from "@/i18n/translate";
import type { ProfileDraftState } from "./useProfileDraftState";
import type { ProfileReduxState } from "./useProfileRedux";

export const DELETE_CONFIRMATION_WORD = "DELETE";

export function useProfileAccountHandlers(r: ProfileReduxState, d: ProfileDraftState, user: UserService) {
  const dispatch = useAppDispatch();
  const singleFlight = useSingleFlight();

  const onSaveUsername = React.useCallback(() => singleFlight(async () => {
    if (!r.accessToken || !d.draftUsername.trim() || d.busyAction) return;
    d.setBusyAction("username");
    await updateUsername(user, d.draftUsername.trim(), dispatch, () => d.setUsernameModalVisible(false));
    d.setBusyAction(null);
  }), [r.accessToken, d, dispatch, user, singleFlight]);

  const onChangePassword = React.useCallback(() => singleFlight(async () => {
    if (!r.accessToken || d.busyAction) return;
    const passwordError = passwordPolicyError(d.newPassword);
    if (passwordError) { Alert.alert(t("settings.changePassword"), passwordError); return; }
    d.setBusyAction("password");
    await changePasswordRequest(user, d.currentPassword, d.newPassword, dispatch, () => {
      d.setCurrentPassword("");
      d.setNewPassword("");
      d.setPasswordModalVisible(false);
    });
    d.setBusyAction(null);
  }), [r.accessToken, d, dispatch, user, singleFlight]);

  const onDeleteAccount = React.useCallback(() => singleFlight(async () => {
    if (!r.accessToken || d.confirmDeleteText !== DELETE_CONFIRMATION_WORD || d.busyAction) return;
    d.setBusyAction("delete");
    await deleteAccountRequest(user, dispatch, () => {
      d.setDeleteModalVisible(false);
      d.setConfirmDeleteText("");
    });
    d.setBusyAction(null);
  }), [r.accessToken, d, dispatch, user, singleFlight]);

  const onLogoutPress = React.useCallback(() => {
    Alert.alert(t("settings.signOutTitle"), t("settings.signOutBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.signOut"), style: "destructive", onPress: () => void confirmLogout(dispatch, r.accessToken, r.refreshToken) },
    ]);
  }, [dispatch, r.accessToken, r.refreshToken]);

  /** Only a guest resets: their progress lives on this device alone, and a registered account keeps its history. */
  const onResetLearningProgress = React.useCallback(() => {
    Alert.alert(t("settings.resetConfirmTitle"), t("settings.resetConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.resetConfirm"), style: "destructive", onPress: () => dispatch(resetLearning()) },
    ]);
  }, [dispatch]);

  return { onSaveUsername, onChangePassword, onDeleteAccount, onLogoutPress, onResetLearningProgress };
}
