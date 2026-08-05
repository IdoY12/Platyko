import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.xl,
  },
  title: { color: colors.textPrimary, fontWeight: "800", fontSize: fontSize.md, marginBottom: spacing.md },
  bodyText: { color: colors.textSecondary, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.button,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.xs },
  ghost: { paddingHorizontal: spacing.md, minHeight: 44, alignItems: "center", justifyContent: "center" },
  ghostTxt: { color: colors.textSecondary, fontWeight: "700" },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTxt: { color: colors.onAccent, fontWeight: "800" },
  danger: {
    backgroundColor: colors.danger,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerTxt: { color: colors.background, fontWeight: "800" },
});
