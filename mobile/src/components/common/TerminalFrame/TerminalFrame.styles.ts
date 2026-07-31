import { StyleSheet } from "react-native";
import { colors, font, fontSize, radius, spacing } from "@/theme/theme";

const CORNER_SIZE = 10;
const CORNER_WEIGHT = 2;

export const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  label: {
    color: colors.textMuted,
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.accent,
  },
  cornerTopLeft: { top: -1, left: -1, borderTopWidth: CORNER_WEIGHT, borderLeftWidth: CORNER_WEIGHT },
  cornerTopRight: { top: -1, right: -1, borderTopWidth: CORNER_WEIGHT, borderRightWidth: CORNER_WEIGHT },
  cornerBottomLeft: { bottom: -1, left: -1, borderBottomWidth: CORNER_WEIGHT, borderLeftWidth: CORNER_WEIGHT },
  cornerBottomRight: { bottom: -1, right: -1, borderBottomWidth: CORNER_WEIGHT, borderRightWidth: CORNER_WEIGHT },
});
