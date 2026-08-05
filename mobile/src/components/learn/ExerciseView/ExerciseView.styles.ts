import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing, tint } from "@/theme/theme";
import { primaryButton, primaryButtonLabel } from "@/theme/primaryButton";

/** Shared styles for lesson exercise panels (MCQ options, PUZZLE fill) inside a TerminalFrame. */
export const exerciseViewStyles = StyleSheet.create({
  hint: { color: colors.textSecondary, lineHeight: 22 },
  option: {
    padding: spacing.md,
    borderRadius: radius.button,
    borderColor: colors.border,
    borderWidth: 1,
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  optionLabel: { color: colors.textPrimary },
  correct: { borderColor: colors.success, backgroundColor: tint.success },
  wrong: { borderColor: colors.danger, backgroundColor: tint.danger },
  optionSelected: { borderColor: colors.accent, backgroundColor: tint.accent },
  lessonButton: { ...primaryButton, marginTop: spacing.md },
  lessonButtonLabel: { ...primaryButtonLabel },
  disabled: { opacity: 0.5 },
  feedback: { marginTop: spacing.sm, fontWeight: "700", color: colors.textPrimary },
  feedbackGood: { color: colors.success },
  feedbackBad: { color: colors.danger },
  codePuzzleTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
    minHeight: 44,
    marginBottom: spacing.md,
  },
  codePuzzleTokenRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  codePuzzleTokenChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  codePuzzleTokenChipLabel: { color: colors.accent, fontSize: fontSize.sm },
});
