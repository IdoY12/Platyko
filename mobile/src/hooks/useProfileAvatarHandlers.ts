import React from "react";
import { Alert } from "react-native";
import { useAppDispatch } from "@/redux/hooks";
import type UserService from "@/services/auth-aware/UserService";
import { handleAvatarUploadError, runAvatarUpload } from "@/utils/profileAvatarUpload";
import type { ProfileDraftState } from "./useProfileDraftState";
import type { ProfileReduxState } from "./useProfileRedux";

export function useProfileAvatarHandlers(r: ProfileReduxState, d: ProfileDraftState, user: UserService | null) {
  const dispatch = useAppDispatch();
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); }, []);

  const pickImageAndUpload = React.useCallback(
    async (source: "camera" | "library") => {
      if (!r.accessToken || !user || d.uploadingAvatar) return;

      try {
        d.setUploadingAvatar(true);
        await runAvatarUpload(user, source, dispatch, d.setUploadProgress, d.setSaveMessage);
      } catch (error) {
        handleAvatarUploadError(error);
      } finally {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          resetTimerRef.current = null;
          d.setUploadProgress(0);
          d.setUploadingAvatar(false);
        }, 250);
      }
    },
    [r.accessToken, d, dispatch, user],
  );

  const onAvatarPress = React.useCallback(() => {
    Alert.alert("Update profile picture", "Choose where to get your photo from.", [
      { text: "Cancel", style: "cancel" },
      { text: "Take Photo", onPress: () => void pickImageAndUpload("camera") },
      { text: "Choose from Library", onPress: () => void pickImageAndUpload("library") },
    ]);
  }, [pickImageAndUpload]);

  return { onAvatarPress };
}
