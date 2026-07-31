import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, radius, spacing } from "@/theme/theme";

export const profileSectionCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeader: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.md, fontWeight: "700", marginBottom: spacing.md },
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
