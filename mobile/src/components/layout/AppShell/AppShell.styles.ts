import { StyleSheet } from "react-native";
import { colors, font, fontSize, radius, spacing } from "@/theme/theme";

const banner = {
  position: "absolute" as const,
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
  offlineText: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.sm },
  bootstrapBanner: {
    ...banner,
    zIndex: 51,
    borderLeftColor: colors.danger,
    gap: spacing.sm,
  },
  bootstrapText: { color: colors.danger, fontFamily: font.mono, fontSize: fontSize.sm },
  bootstrapRetry: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  bootstrapRetryLabel: { color: colors.onAccent, fontWeight: "800" },
});
