import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, spacing } from "@/theme/theme";
import { primaryButton, primaryButtonLabel } from "@/theme/primaryButton";

export const learnRoadmapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xxl, paddingTop: spacing.lg },
  title: {
    color: colors.textPrimary,
    fontFamily: font.mono,
    fontSize: fontSize.lg,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: font.mono,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  connector: {
    alignSelf: "center",
    width: 2,
    height: spacing.xxxl,
    backgroundColor: colors.accent,
    opacity: 0.7,
    ...glow.accent,
  },
  chapterTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: "700" },
  chapterDesc: { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  lessonButton: { ...primaryButton },
  lessonButtonLabel: { ...primaryButtonLabel },
  footerZone: {
    flex: 1,
    minHeight: 110,
    marginTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  footerLabel: { color: colors.textMuted, fontFamily: font.mono, fontSize: fontSize.xs, letterSpacing: 1 },
});
