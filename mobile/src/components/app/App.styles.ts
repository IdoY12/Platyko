import { StyleSheet } from "react-native";
import { colors, font, fontSize, radius, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  root: { flex: 1 },
  crashScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
    gap: spacing.lg,
  },
  crashTitle: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.lg, textAlign: "center" },
  crashBody: { color: colors.textSecondary, fontFamily: font.mono, fontSize: fontSize.sm, textAlign: "center" },
  crashButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.button,
  },
  crashButtonLabel: { color: colors.onAccent, fontFamily: font.mono, fontSize: fontSize.base, fontWeight: "800" },
});
