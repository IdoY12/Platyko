import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.lg,
    marginRight: 0,
    marginVertical: -spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: font.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 1,
    flexShrink: 1,
  },
  caret: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: fontSize.md,
    marginLeft: spacing.xs,
  },
  scanline: {
    position: "absolute",
    left: spacing.xxl,
    bottom: -1,
    width: 56,
    height: 2,
    backgroundColor: colors.accent,
    ...glow.accent,
  },
  scanlineShifted: { left: spacing.giant + spacing.xs },
});
