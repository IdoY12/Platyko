import * as Haptics from "expo-haptics";

/**
 * The app's haptic vocabulary (PRD 12.7): light on a selection, success on a correct answer,
 * error on a wrong one. A haptic always accompanies a visible change and is never the only
 * feedback; failures (haptics off, unsupported hardware) are ignored.
 */
export const haptic = {
  selection: () => void Haptics.selectionAsync().catch(() => undefined),
  press: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  commit: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
};
