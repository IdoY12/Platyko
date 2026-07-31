import type { MutableRefObject } from "react";
import { Alert } from "react-native";

export function drainRefInt(ref: MutableRefObject<number>): number {
  const value = ref.current;
  ref.current = 0;
  return value;
}

export function duelQueueRejectMessage(reason: string): string {
  if (reason === "already_in_duel") {
    return "Your account is already in a duel on another device. Finish that duel on the other device, then try again.";
  }
  if (reason === "superseded_by_other_device") {
    return "You started matchmaking on another device signed in with this account. This search was cancelled.";
  }
  return "Session expired. Please log out and back in to play duels.";
}

export function guardDuelAccess(isGuest: boolean, onAuth: () => void, onAllowed: () => void): void {
  if (!isGuest) {
    onAllowed();
    return;
  }
  Alert.alert(
    "Account Required",
    "To play 1v1 Duels, you need a free account. Your XP and match history are tied to your account and cannot be saved as a guest.",
    [{ text: "Cancel", style: "cancel" }, { text: "Sign In / Register", onPress: onAuth }],
  );
}
