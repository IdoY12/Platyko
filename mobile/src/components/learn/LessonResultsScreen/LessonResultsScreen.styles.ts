import { StyleSheet } from "react-native";
import { colors, font, fontSize, spacing } from "@/theme/theme";
import { primaryButton, primaryButtonLabel } from "@/theme/primaryButton";

export const lessonResultsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xxl, gap: spacing.lg, justifyContent: "center" },
  title: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.xl, fontWeight: "800" },
  lessonButton: { ...primaryButton },
  lessonButtonLabel: { ...primaryButtonLabel },
  resultsCard: { gap: spacing.sm },
  resultText: { color: colors.textSecondary, fontFamily: font.mono, fontSize: fontSize.base },
  starRow: { flexDirection: "row", gap: spacing.xs },
});
