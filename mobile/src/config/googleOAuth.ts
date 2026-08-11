import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { makeRedirectUri } from "expo-auth-session";

/** Google OAuth client IDs (public). Backend verifies id_token audience against web + iOS. */
export const GOOGLE_WEB_CLIENT_ID =
  "858033290834-7vrs7u956crqi2ci1kfgtqjvikd5o66a.apps.googleusercontent.com";
export const GOOGLE_IOS_CLIENT_ID =
  "858033290834-bhhndi5aqeqtj9r4t0fd3u5vs4aq9snd.apps.googleusercontent.com";
/** Console > Credentials > "Android" client (android.package + signing SHA-1). Empty until created. */
export const GOOGLE_ANDROID_CLIENT_ID = "";

/**
 * Google iOS clients accept exactly one redirect scheme: the client ID with its two halves swapped.
 * Must also be registered in mobile/app.json `scheme` so iOS hands the callback back to the app.
 */
export function reversedClientIdScheme(clientId: string): string {
  return `com.googleusercontent.apps.${clientId.replace(".apps.googleusercontent.com", "")}`;
}

/** Expo Go can only serve exp:// URLs, which Google rejects as a non-compliant redirect_uri. */
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * iOS pins the reversed-client-id redirect. Android is left undefined so expo-auth-session falls
 * back to `<android.package>:/oauthredirect`, which is what a Google Android client expects.
 */
export const googleAuthRequestConfig = {
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  webClientId: GOOGLE_WEB_CLIENT_ID,
  redirectUri:
    Platform.OS === "ios"
      ? makeRedirectUri({ native: `${reversedClientIdScheme(GOOGLE_IOS_CLIENT_ID)}:/oauthredirect` })
      : undefined,
};

/** Null when Google sign-in can run here, otherwise the reason to show the user. */
export function googleSignInUnavailableReason(): string | null {
  if (IS_EXPO_GO) {
    return "Google sign-in needs a development build — Expo Go cannot register Google's redirect scheme. Sign in with email and password instead.";
  }
  if (Platform.OS === "android" && !GOOGLE_ANDROID_CLIENT_ID) {
    return "Google sign-in is not configured for Android yet. Sign in with email and password instead.";
  }
  return null;
}
