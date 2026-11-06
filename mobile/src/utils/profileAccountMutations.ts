import { usernameValidationError } from "@project/user-credentials";
import axios from "axios";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { apiErrorMessage, serverErrorMessage } from "@/services/auth";
import { logError } from "@/utils/logger";
import { setUserIdentity } from "@/redux/profile-slice";
import { updateTokens } from "@/redux/session-slice";
import { REDUX_PERSIST_KEY } from "@/utils/hydrateStore";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";

export async function updateUsername(
  user: UserService,
  name: string,
  dispatch: AppDispatch,
  onDone: () => void,
  setMessage: (m: string | null) => void,
): Promise<void> {
  const trimmed = name.trim();
  const uerr = usernameValidationError(trimmed);
  if (uerr) {
    Alert.alert("Invalid username", uerr);
    return;
  }
  try {
    const updated = await user.patchUsername(trimmed);
    dispatch(setUserIdentity({ username: updated.username }));
    onDone();
    setMessage("Username updated.");
  } catch (error) {
    logError("[PROFILE]", error, { phase: "update-username" });
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      Alert.alert("Update failed", apiErrorMessage(error));
      return;
    }
    Alert.alert("Update failed", "Could not update username right now.");
  }
}

export async function changePasswordRequest(
  user: UserService,
  currentPassword: string,
  newPassword: string,
  dispatch: AppDispatch,
  onSuccess: () => void,
  setMessage: (m: string | null) => void,
): Promise<void> {
  try {
    const { accessToken, refreshToken } = await user.changePassword(currentPassword, newPassword);
    dispatch(updateTokens({ accessToken, refreshToken }));
    onSuccess();
    setMessage("Password changed.");
  } catch (error) {
    logError("[PROFILE]", error, { phase: "change-password" });
    Alert.alert("Could not change password", serverErrorMessage(error) ?? "Check your current password and try again.");
  }
}

export async function deleteAccountRequest(
  user: UserService,
  dispatch: AppDispatch,
  onClose: () => void,
): Promise<void> {
  try {
    await user.deleteAccount();
    await AsyncStorage.removeItem(REDUX_PERSIST_KEY);
    resetStoresAfterLogout(dispatch);
    onClose();
  } catch (error) {
    logError("[PROFILE]", error, { phase: "delete-account" });
    Alert.alert("Deletion failed", "We could not delete your account. Please try again.");
  }
}
