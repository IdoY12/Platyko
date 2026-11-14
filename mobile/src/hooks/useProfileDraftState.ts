import React from "react";
import type { ProfileReduxState } from "./useProfileRedux";

/** What the Settings screen is editing: the reminder switch, the photo upload and the account dialogs. */
export function useProfileDraftState(r: ProfileReduxState) {
  const [draftNotifications, setDraftNotifications] = React.useState<boolean>(r.notificationsEnabled);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [usernameModalVisible, setUsernameModalVisible] = React.useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = React.useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [draftUsername, setDraftUsername] = React.useState(r.username);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmDeleteText, setConfirmDeleteText] = React.useState("");
  const [busyAction, setBusyAction] = React.useState<string | null>(null);

  return {
    draftNotifications,
    setDraftNotifications,
    uploadingAvatar,
    setUploadingAvatar,
    uploadProgress,
    setUploadProgress,
    usernameModalVisible,
    setUsernameModalVisible,
    passwordModalVisible,
    setPasswordModalVisible,
    deleteModalVisible,
    setDeleteModalVisible,
    draftUsername,
    setDraftUsername,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmDeleteText,
    setConfirmDeleteText,
    busyAction,
    setBusyAction,
  };
}

export type ProfileDraftState = ReturnType<typeof useProfileDraftState>;
