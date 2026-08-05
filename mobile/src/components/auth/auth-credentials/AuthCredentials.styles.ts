import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, radius, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.lg, fontWeight: "800", marginBottom: spacing.xxl },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontFamily: font.mono,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  passwordInput: { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: "transparent" },
  showHide: { paddingHorizontal: spacing.md, minHeight: 44, minWidth: spacing.massive, alignItems: "center", justifyContent: "center" },
  showHideText: { color: colors.accent, fontWeight: "700" },
  primaryButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    ...glow.accent,
  },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: colors.onAccent, fontWeight: "800" },
  errorText: { color: colors.danger, marginTop: spacing.md, textAlign: "center" },
});
