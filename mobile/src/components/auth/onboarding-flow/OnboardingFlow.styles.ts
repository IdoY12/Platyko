import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, radius, spacing } from "@/theme/theme";

export const onboardingFlowStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Horizontal padding lives on the header/cards/footer blocks (not here) so no container edge
  // ever sits flush against a card and the selection glow renders unclipped on every side.
  step: { flex: 1, paddingTop: spacing.huge, justifyContent: "space-between" },
  mainContent: { flex: 1 },
  stepHeader: { paddingHorizontal: spacing.xxl },
  stepProgress: {
    color: colors.textSecondary,
    fontFamily: font.mono,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  // lg (not xl): the largest mono size at which the longest step title still wraps in two
  // full-size lines on all supported widths — every step renders at this exact same size.
  stepTitle: {
    color: colors.textPrimary,
    fontFamily: font.mono,
    fontSize: fontSize.lg,
    fontWeight: "800",
    marginBottom: spacing.xl,
    lineHeight: 32,
    minHeight: 64,
  },
  cardsArea: { gap: spacing.md, paddingHorizontal: spacing.xxl },
  stepFooter: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xxl },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: spacing.lg,
    alignItems: "center",
    ...glow.accent,
  },
  ctaLabel: { color: colors.onAccent, fontWeight: "800", fontSize: fontSize.base },
  ctaDisabled: { opacity: 0.5 },
  choiceCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  choiceCardOn: { borderColor: colors.accent, ...glow.accent },
  choiceTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "700" },
  choiceSub: { color: colors.textSecondary, marginTop: spacing.sm },
  node: { flex: 1, alignItems: "center", gap: spacing.sm },
  nodeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent },
  nodeLabel: { color: colors.textSecondary, fontSize: fontSize.xs },
  pathText: { color: colors.textSecondary, fontSize: fontSize.base, lineHeight: 24 },
  previewRow: { marginTop: spacing.md, flexDirection: "row" },
  err: { color: colors.danger, textAlign: "center" },
});
