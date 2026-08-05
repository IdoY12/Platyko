import { StyleSheet } from "react-native";
import { colors, font, fontSize, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  subtitle: { color: colors.textSecondary, marginBottom: spacing.xxl },
  emailHighlight: { color: colors.textPrimary, fontWeight: "700" },
  codeInput: { textAlign: "center", fontFamily: font.mono, fontSize: fontSize.xl, letterSpacing: 10 },
  resendBtn: { marginTop: spacing.lg, minHeight: 44, alignItems: "center", justifyContent: "center" },
  resendText: { color: colors.accent, fontWeight: "700" },
  resendTextDisabled: { color: colors.textMuted },
});
