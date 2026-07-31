import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: "800", marginBottom: spacing.xxl },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  passwordInput: { flex: 1, marginBottom: 0 },
  showHide: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  showHideText: { color: colors.accent, fontWeight: "700" },
  primaryButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: colors.onAccent, fontWeight: "800" },
  errorText: { color: colors.danger, marginTop: spacing.md, textAlign: "center" },
});
