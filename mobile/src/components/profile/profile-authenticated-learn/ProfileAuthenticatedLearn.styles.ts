import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing, tint } from "@/theme/theme";

export const l = StyleSheet.create({
  optRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: tint.accent },
  chipTxt: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: "600" },
  chipTxtOn: { color: colors.accent },
});
