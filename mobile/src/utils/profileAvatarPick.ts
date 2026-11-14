import { Alert } from "react-native";
import { t } from "@/i18n/translate";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_BYTES = 5 * 1024 * 1024;

export async function ensurePickerPermission(source: "camera" | "library"): Promise<boolean> {
  const result =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (result.status === ImagePicker.PermissionStatus.GRANTED) return true;
  Alert.alert(t("settings.photoTitle"), t("errors.photoPermission"));
  return false;
}

export async function pickImageUri(source: "camera" | "library"): Promise<string | null> {
  const launch =
    source === "camera"
      ? () => ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 })
      : () => ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  const pickerResult = await launch();
  if (pickerResult.canceled || !pickerResult.assets[0]) return null;
  return pickerResult.assets[0].uri;
}

export async function resizeToJpeg(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800, height: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return manipulated.uri;
}

export function alertIfBlobTooLarge(blob: Blob): boolean {
  if (blob.size <= MAX_BYTES) return false;
  Alert.alert(t("settings.photoTitle"), t("errors.photoTooLarge"));
  return true;
}
