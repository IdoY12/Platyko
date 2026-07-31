import { StyleSheet } from "react-native";
import { colors, font, fontSize, radius, spacing } from "@/theme/theme";

export const t = StyleSheet.create({
  skWrap: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: spacing.xl, alignItems: "center", gap: spacing.md },
  skCirc: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surface },
  skLg: { width: 180, height: 20, borderRadius: 10, backgroundColor: colors.surface },
  skSm: { width: 130, height: 14, borderRadius: 8, backgroundColor: colors.surface },
  skRow: { flexDirection: "row", gap: spacing.sm },
  skCard: { width: 95, height: 70, borderRadius: radius.card, backgroundColor: colors.surface },
  hero: { alignItems: "center", backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  avatarShell: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: colors.border },
  initialsAv: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  initialsTxt: { color: colors.accent, fontFamily: font.mono, fontSize: 42, fontWeight: "800" },
  camBadge: { position: "absolute", bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.background },
  name: { marginTop: spacing.md, color: colors.textPrimary, fontFamily: font.mono, fontSize: fontSize.lg, fontWeight: "800" },
  email: { color: colors.textSecondary, marginTop: spacing.xs },
  meta: { color: colors.success, fontFamily: font.mono, fontSize: fontSize.sm, marginTop: spacing.sm, fontWeight: "700" },
  upCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.md, borderColor: colors.border, borderWidth: 1, flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  upTxt: { color: colors.textSecondary, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: spacing.md },
  pill: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, alignItems: "center", paddingVertical: spacing.md },
  pillVal: { marginTop: spacing.xs, color: colors.textPrimary, fontFamily: font.mono, fontWeight: "800", fontSize: fontSize.md, fontVariant: ["tabular-nums"] },
  pillLbl: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.sm },
});
