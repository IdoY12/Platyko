import { StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg, paddingBottom: spacing.massive },
  greeting: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: "800" },
  date: { color: colors.textSecondary, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  heroCard: { backgroundColor: "#243b53", borderRadius: radius.card, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: fontSize.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textMuted },
  dotDone: { backgroundColor: colors.accent },
  progressTrack: { marginTop: spacing.md, height: 10, borderRadius: 5, backgroundColor: "#0f172a", overflow: "hidden" },
  progressFill: { height: 10, backgroundColor: colors.accent },
  subText: { color: colors.textSecondary, marginTop: spacing.sm },
  primary: { marginTop: spacing.lg, backgroundColor: colors.accent, borderRadius: radius.button, padding: spacing.md, alignItems: "center" },
  primaryText: { color: "#111", fontWeight: "800" },
  secondary: { marginTop: spacing.md, borderColor: colors.duel, borderWidth: 1, borderRadius: radius.button, padding: spacing.md, alignItems: "center" },
  secondaryText: { color: colors.duel, fontWeight: "700" },
});
