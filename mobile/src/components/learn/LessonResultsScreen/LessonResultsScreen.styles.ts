import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const lessonResultsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg, justifyContent: "center" },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: "800" },
  lessonButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.button,
    alignItems: "center",
    marginTop: spacing.md,
  },
  lessonButtonLabel: { color: "#111", fontWeight: "800" },
  resultText: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.md },
  starRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.lg },
});
