import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing, tint } from "@/theme/theme";

/** Shared styles for lesson exercise panels (card, MCQ options, PUZZLE fill). */
export const exerciseViewStyles = StyleSheet.create({
  root: { flex: 1 },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  explanation: { color: colors.textSecondary, lineHeight: 22 },
  hint: { color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xs },
  option: {
    padding: spacing.md,
    borderRadius: radius.button,
    borderColor: colors.border,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  optionLabel: { color: colors.textPrimary },
  correct: { borderColor: colors.success, backgroundColor: tint.success },
  wrong: { borderColor: colors.danger, backgroundColor: tint.danger },
  optionSelected: { borderColor: colors.accent },
  lessonButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.button,
    alignItems: "center",
    marginTop: spacing.md,
  },
  lessonButtonLabel: { color: colors.onAccent, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  feedback: { marginTop: spacing.md, fontWeight: "700", color: colors.textPrimary },
  feedbackGood: { color: colors.success },
  feedbackBad: { color: colors.danger },
  codePuzzleTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  codePuzzleTokenRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  codePuzzleTokenChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codePuzzleTokenChipLabel: { color: colors.accent, fontSize: fontSize.sm },
});
