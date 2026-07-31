import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const onboardingFlowStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  step: { flex: 1, paddingTop: spacing.huge, paddingHorizontal: spacing.xxl, justifyContent: "space-between" },
  mainContent: { flex: 1 },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: "800",
    marginBottom: spacing.xl,
    lineHeight: 40,
  },
  scrollContent: { gap: spacing.md, flexGrow: 1, paddingBottom: spacing.md },
  stepFooter: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  ctaLabel: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.base },
  ctaDisabled: { opacity: 0.5 },
  choiceCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  choiceCardOn: { borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 12 },
  choiceTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "700" },
  choiceSub: { color: colors.textSecondary, marginTop: spacing.sm },
  node: { alignItems: "center", gap: spacing.sm },
  nodeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent },
  nodeLabel: { color: colors.textSecondary, fontSize: fontSize.xs },
  pathText: { color: colors.textSecondary, fontSize: fontSize.base, lineHeight: 24 },
  previewRow: { marginTop: spacing.xxl, flexDirection: "row", justifyContent: "space-between" },
  err: { marginTop: spacing.md, color: colors.danger, textAlign: "center" },
});
