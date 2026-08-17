import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/theme/theme";

export const b = StyleSheet.create({
  cardStack: { gap: spacing.sm },
  dangerCard: { borderColor: colors.danger },
  dangerLbl: { color: colors.danger },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLbl: { color: colors.danger, fontWeight: "800" },
});
