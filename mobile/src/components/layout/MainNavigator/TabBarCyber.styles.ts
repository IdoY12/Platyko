import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  indicator: {
    position: "absolute",
    top: -1,
    left: 0,
    height: 2,
    backgroundColor: colors.accent,
    ...glow.accent,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  label: {
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
