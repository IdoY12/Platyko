import { Alert } from "react-native";
import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { logError } from "@/utils/logger";
import { setUserIdentity } from "@/redux/profile-slice";
import {
  alertIfBlobTooLarge,
  ensurePickerPermission,
  pickImageUri,
  resizeToJpeg,
} from "@/utils/profileAvatarPick";

async function persistAvatarUrl(user: UserService, publicUrl: string, dispatch: AppDispatch): Promise<void> {
  const saved = await user.patchAvatar(publicUrl);
  dispatch(setUserIdentity({ avatarUrl: saved.avatarUrl }));
}

export async function runAvatarUpload(
  user: UserService,
  source: "camera" | "library",
  dispatch: AppDispatch,
  setProgress: (n: number) => void,
): Promise<void> {
  setProgress(8);
  const allowed = await ensurePickerPermission(source);
  if (!allowed) return;
  setProgress(12);
  const rawUri = await pickImageUri(source);
  if (!rawUri) return;
  setProgress(20);
  const jpegUri = await resizeToJpeg(rawUri);
  setProgress(38);
  // Read the local file URI into a Blob using fetch (React Native native fetch handles
  // file:// URIs correctly, unlike axios/XHR).
  const response = await fetch(jpegUri);
  if (!response.ok) throw new Error(`Failed to read image (${response.status})`);
  const blob = await response.blob();
  if (alertIfBlobTooLarge(blob)) return;
  setProgress(55);
  // Upload through the backend (server → S3), avoiding presigned-URL host/signature
  // mismatches that occur when a physical device accesses a local dev S3 endpoint.
  const { publicUrl } = await user.uploadAvatarBlob(blob);
  setProgress(85);
  await persistAvatarUrl(user, publicUrl, dispatch);
  setProgress(100);
}

export function handleAvatarUploadError(error: unknown): void {
  logError("[PROFILE]", error, { phase: "avatar-upload" });
  Alert.alert("Upload failed", "Could not update profile picture. Please try again.");
}
