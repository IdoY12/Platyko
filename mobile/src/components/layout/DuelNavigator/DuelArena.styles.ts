import { StyleSheet } from "react-native";
import { colors, font, fontSize, glow, spacing } from "@/theme/theme";

/** Styles for the DuelHome arena composition (centerpiece, HUD, bottom CTA). */
export const arenaStyles = StyleSheet.create({
  arena: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.huge,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
  },
  swordGlyph: { ...glow.duel },
  hud: { alignSelf: "stretch" },
  hudRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  hudCell: { flex: 1, alignItems: "center", gap: spacing.xs },
  hudDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.border },
  hudValue: {
    color: colors.textPrimary,
    fontFamily: font.mono,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  hudLabel: {
    color: colors.textMuted,
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  ctaWrap: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xl },
});
