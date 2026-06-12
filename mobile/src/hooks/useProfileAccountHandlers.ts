import React from "react";
import { passwordPolicyError } from "@project/user-credentials";
import { Alert } from "react-native";
import { useAppDispatch } from "@/redux/hooks";
import LearningService from "@/services/auth-aware/LearningService";
import type UserService from "@/services/auth-aware/UserService";
import { resetLesson } from "@/redux/lesson-slice";
import { changePasswordRequest, deleteAccountRequest, updateUsername } from "@/utils/profileAccountMutations";
import { patchLearningSettings } from "@/utils/profileUiAndPreferences";
import { confirmLogout } from "@/utils/confirmLogout";
import type { ProfileDraftState } from "./useProfileDraftState";
import type { ProfileReduxState } from "./useProfileRedux";

export function useProfileAccountHandlers(r: ProfileReduxState, d: ProfileDraftState, user: UserService | null) {
  const dispatch = useAppDispatch();

  const onSaveLearningSettings = React.useCallback(async () => {
    if (!r.accessToken || !user || d.saving) return;
    d.setSaving(true);
    d.setSaveMessage(null);
    await patchLearningSettings(user, d.draftGoal, d.draftLevel, d.draftCommitment, d.draftNotifications, dispatch, d.setSaveMessage);
    d.setSaving(false);
  }, [r.accessToken, d.saving, d.draftGoal, d.draftLevel, d.draftCommitment, d.draftNotifications, dispatch, d.setSaving, d.setSaveMessage, user]);

  const onSaveUsername = React.useCallback(async () => {
    if (!r.accessToken || !user || !d.draftUsername.trim() || d.busyAction) return;
    d.setBusyAction("username");
    await updateUsername(user, d.draftUsername.trim(), dispatch, () => d.setUsernameModalVisible(false), d.setSaveMessage);
    d.setBusyAction(null);
  }, [r.accessToken, d.draftUsername, d.busyAction, dispatch, d.setBusyAction, d.setUsernameModalVisible, d.setSaveMessage, user]);

  const onChangePassword = React.useCallback(async () => {
    if (!r.accessToken || !user || d.busyAction) return;

    const passwordError = passwordPolicyError(d.newPassword);
    if (passwordError) {
      Alert.alert("Invalid password", passwordError);
      return;
    }
    d.setBusyAction("password");
    await changePasswordRequest(user, d.currentPassword, d.newPassword, () => {
      d.setCurrentPassword("");
      d.setNewPassword("");
      d.setPasswordModalVisible(false);
    }, d.setSaveMessage);
    d.setBusyAction(null);
  }, [r.accessToken, d.busyAction, d.newPassword, d.currentPassword, d.setBusyAction, d.setCurrentPassword, d.setNewPassword, d.setPasswordModalVisible, d.setSaveMessage, user]);

  const onDeleteAccount = React.useCallback(async () => {
    if (!r.accessToken || !user || d.confirmDeleteText !== "DELETE" || d.busyAction) return;
    d.setBusyAction("delete");
    await deleteAccountRequest(user, dispatch, () => {
      d.setDeleteModalVisible(false);
      d.setConfirmDeleteText("");
    });
    d.setBusyAction(null);
  }, [r.accessToken, d.confirmDeleteText, d.busyAction, dispatch, d.setBusyAction, d.setDeleteModalVisible, d.setConfirmDeleteText, user]);

  const onLogoutPress = React.useCallback(() => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => void confirmLogout(dispatch, r.accessToken, r.refreshToken) },
    ]);
  }, [dispatch, r.accessToken, r.refreshToken]);
  const onResetLearningProgress = React.useCallback(() => {
    if (!r.accessToken) return;
    Alert.alert("Reset Learn Progress", "This will permanently delete all your learning progress and cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => { try { await new LearningService().resetProgress(); } catch { /**/ } dispatch(resetLesson()); } },
    ]);
  }, [dispatch, r.accessToken]);

  return {
    onSaveLearningSettings,
    onSaveUsername,
    onChangePassword,
    onDeleteAccount,
    onLogoutPress,
    onResetLearningProgress,
  };
}
