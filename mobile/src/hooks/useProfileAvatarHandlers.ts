import React from "react";
import { Alert } from "react-native";
import { useAppDispatch } from "@/redux/hooks";
import type UserService from "@/services/auth-aware/UserService";
import { t } from "@/i18n/translate";
import { handleAvatarUploadError, runAvatarUpload } from "@/utils/profileAvatarUpload";
import type { ProfileDraftState } from "./useProfileDraftState";
import type { ProfileReduxState } from "./useProfileRedux";

export function useProfileAvatarHandlers(r: ProfileReduxState, d: ProfileDraftState, user: UserService) {
  const dispatch = useAppDispatch();
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); }, []);

  const pickImageAndUpload = React.useCallback(
    async (source: "camera" | "library") => {
      if (!r.accessToken || d.uploadingAvatar) return;

      try {
        d.setUploadingAvatar(true);
        await runAvatarUpload(user, source, dispatch, d.setUploadProgress);
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
    Alert.alert(t("settings.photoTitle"), t("settings.photoBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.photoCamera"), onPress: () => void pickImageAndUpload("camera") },
      { text: t("settings.photoLibrary"), onPress: () => void pickImageAndUpload("library") },
    ]);
  }, [pickImageAndUpload]);

  return { onAvatarPress };
}
