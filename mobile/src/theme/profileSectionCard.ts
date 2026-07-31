import { StyleSheet } from "react-native";
import { colors, glow, radius, spacing } from "@/theme/theme";

export const profileSectionCardStyles = StyleSheet.create({
  fieldLabel: { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm, fontWeight: "700" },
  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: "center",
    ...glow.accent,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonLabel: { color: colors.onAccent, fontWeight: "800" },
  saveMessage: { marginTop: spacing.sm, color: colors.success, fontWeight: "700" },
});
