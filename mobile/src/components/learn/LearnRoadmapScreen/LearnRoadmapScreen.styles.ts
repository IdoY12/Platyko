import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, radius, spacing } from "@/theme/theme";

export const learnRoadmapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg },
  title: {
    color: colors.textPrimary,
    fontFamily: font.mono,
    fontSize: fontSize.lg,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: { color: colors.textSecondary, fontFamily: font.mono, fontSize: fontSize.sm, fontWeight: "400" },
  chapterTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "700" },
  chapterDesc: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  lessonButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.button,
    alignItems: "center",
    ...glow.accent,
  },
  lessonButtonLabel: { color: colors.onAccent, fontWeight: "800" },
});
