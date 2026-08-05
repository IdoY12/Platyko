import { StyleSheet } from "react-native";
import { colors, font, fontSize, radius, spacing } from "@/theme/theme";

/** Terminal syntax voice, straight from the CYBERDECK palette. */
export const syntax = {
  keyword: colors.duel,
  string: colors.accent,
  number: colors.cyan,
  plain: colors.textPrimary,
};

export const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  codeVerticalScroll: { maxHeight: 170 },
  code: {
    color: syntax.plain,
    fontFamily: font.mono,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  codeBlock: { padding: spacing.lg },
  output: {
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  outputTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: font.mono,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  outputScroll: { maxHeight: 120 },
  outputValue: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontFamily: font.mono,
    lineHeight: 20,
  },
});
