import { Alert } from "react-native";
import type { AuthSessionResult } from "expo-auth-session";
import { logAuth, logError } from "@/utils/logger";

/**
 * Returns the Google id token when the auth response is a usable success.
 * Every other outcome is surfaced: alert for failures, explicit log for user cancellation.
 */
export function handleGoogleAuthResponse(res: AuthSessionResult | null): string | null {
  if (!res) return null;
  if (res.type === "error") {
    logError("[AUTH]", res.error ?? new Error("google-auth-error"), { mode: "google" });
    Alert.alert("Google sign-in", "Google sign-in failed. Please try again.");
    return null;
  }
  if (res.type !== "success") {
    // Genuine user cancellation — no alert by design, but never silent in the logs. "opened"/"locked" are transient.
    if (res.type === "cancel" || res.type === "dismiss") logAuth("google:cancelled", { type: res.type });
    return null;
  }
  const id =
    res.authentication?.idToken ?? (typeof res.params?.id_token === "string" ? res.params.id_token : undefined);
  if (!id) {
    logError("[AUTH]", new Error("google-no-id-token"), { mode: "google" });
    Alert.alert("Google sign-in", "Google did not return an identity token. Please try again.");
    return null;
  }
  return id;
}
