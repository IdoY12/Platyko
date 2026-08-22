import React from "react";
import { commitmentOptions, goals, levels } from "@/constants/learningSettings";
import { profileInitials, profileStatsFromRedux } from "@/utils/profileUiAndPreferences";
import type { ProfileReduxState } from "./useProfileRedux";

export function useProfileDraftState(r: ProfileReduxState) {
  const [draftGoal, setDraftGoal] = React.useState<(typeof goals)[number]["key"]>(r.goal ?? "FUN");
  const [draftLevel, setDraftLevel] = React.useState<(typeof levels)[number]["key"]>(r.experienceLevel ?? "JUNIOR");
  const [draftCommitment, setDraftCommitment] = React.useState<(typeof commitmentOptions)[number]["key"]>(
    r.commitment ?? "15",
  );
  const [draftNotifications, setDraftNotifications] = React.useState<boolean>(r.notificationsEnabled);
  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [screenLoading, setScreenLoading] = React.useState(true);
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

  const initials = profileInitials(r.username);
  const { streakCurrent, xp, lessonsCompleted } = r;
  const stats = React.useMemo(
    () => profileStatsFromRedux({ streakCurrent, xp, lessonsCompleted }),
    [streakCurrent, xp, lessonsCompleted],
  );

  return {
    draftGoal,
    setDraftGoal,
    draftLevel,
    setDraftLevel,
    draftCommitment,
    setDraftCommitment,
    draftNotifications,
    setDraftNotifications,
    saving,
    setSaving,
    saveMessage,
    setSaveMessage,
    screenLoading,
    setScreenLoading,
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
    initials,
    stats,
    goals,
    levels,
    commitmentOptions,
  };
}

export type ProfileDraftState = ReturnType<typeof useProfileDraftState>;
