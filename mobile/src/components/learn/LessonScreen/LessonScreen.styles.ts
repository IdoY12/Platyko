import { StyleSheet } from "react-native";
import { colors, font, fontSize, spacing } from "@/theme/theme";

export const lessonScreenStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg },
  title: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.xl, fontWeight: "800" },
  chapterDesc: {
    color: colors.textSecondary,
    fontFamily: font.mono,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  progressText: {
    color: colors.textSecondary,
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
  },
  prompt: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "700" },
});
