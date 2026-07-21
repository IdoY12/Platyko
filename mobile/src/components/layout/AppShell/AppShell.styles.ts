import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

const banner = {
  position: "absolute" as const,
  top: 52,
  left: spacing.md,
  right: spacing.md,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderLeftWidth: 3,
  borderRadius: radius.button,
  padding: spacing.md,
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  offlineBanner: {
    ...banner,
    zIndex: 50,
    borderLeftColor: colors.accent,
  },
  offlineText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: "600" },
  bootstrapBanner: {
    ...banner,
    zIndex: 51,
    borderLeftColor: colors.danger,
    gap: spacing.sm,
  },
  bootstrapText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: "600" },
  bootstrapRetry: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  bootstrapRetryLabel: { color: colors.onAccent, fontWeight: "800" },
});
