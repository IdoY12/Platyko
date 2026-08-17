import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const profileFormRowsStyles = StyleSheet.create({
  rowWithSwitch: {
    minHeight: 52,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  /* Scales about the center, so the switch stays vertically centered inside the 52pt row. */
  switchControl: { alignSelf: "center", transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
  rowText: { color: colors.textPrimary, fontWeight: "600" },
  rowSubText: { color: colors.textSecondary, fontSize: fontSize.sm },
  rowPress: { opacity: 0.75 },
  rowChevron: { color: colors.textSecondary, fontSize: fontSize.lg },
});
