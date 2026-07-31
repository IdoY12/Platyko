import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const learnRoadmapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: "800" },
  chapterNode: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chapterNodeActive: { borderColor: colors.accent },
  chapterTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "700" },
  nodeStatus: { color: colors.success, marginTop: spacing.sm, fontSize: fontSize.sm },
  nodeWrap: { alignItems: "center" },
  connector: { width: 2, height: spacing.lg, backgroundColor: colors.border, marginTop: spacing.sm },
  chapterDesc: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  lessonButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.button,
    alignItems: "center",
    marginTop: spacing.md,
  },
  lessonButtonLabel: { color: colors.onAccent, fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
