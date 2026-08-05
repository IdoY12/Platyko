import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
  },
  secondaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryPressed: { opacity: 0.85 },
  secondaryLabel: { color: colors.textPrimary, fontWeight: "700" },
  terms: { marginTop: spacing.lg, color: colors.textSecondary, fontSize: fontSize.sm, textAlign: "center" },
  switchAuthBtn: { marginTop: spacing.lg, minHeight: 44, alignItems: "center", justifyContent: "center" },
  switchAuthText: { color: colors.accent, fontWeight: "700" },
});
