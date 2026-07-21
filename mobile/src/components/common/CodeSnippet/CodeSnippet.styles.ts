import { StyleSheet } from "react-native";
import { colors, font, fontSize, radius, spacing } from "@/theme/theme";

/** Editor syntax voice: warm, monokai-leaning tones on ink. */
export const syntax = {
  keyword: "#FFD866",
  string: "#A9DC76",
  number: "#78DCE8",
  plain: "#E8E8E6",
};

export const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginVertical: spacing.lg,
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
  outputValue: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontFamily: font.mono,
  },
});
