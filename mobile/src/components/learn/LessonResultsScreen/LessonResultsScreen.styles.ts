import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, radius, spacing } from "@/theme/theme";

export const lessonResultsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xxl, gap: spacing.lg, justifyContent: "center" },
  title: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.xl, fontWeight: "800" },
  lessonButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.button,
    alignItems: "center",
    marginTop: spacing.md,
    ...glow.accent,
  },
  lessonButtonLabel: { color: colors.onAccent, fontWeight: "800" },
  resultText: { color: colors.textSecondary, fontFamily: font.mono, fontSize: fontSize.base, marginTop: spacing.sm },
  starRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.lg },
});
