import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { levelProgress } from "@project/xp-constants";
import { AppText } from "@/components/common/AppText/AppText";
import { t } from "@/i18n/translate";
import { palette, radii, space } from "@/theme/tokens";

type Props = { greeting: string; streak: number; xpTotal: number };

/** Greeting, streak and XP with the level bar: the three numbers a learner checks first (PRD 16.9). */
export function HomeStatsHeader({ greeting, streak, xpTotal }: Props) {
  const level = levelProgress(xpTotal);
  const share = level.xpForNextLevel === 0 ? 0 : level.xpIntoLevel / level.xpForNextLevel;
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <AppText variant="screenTitle" style={styles.greeting} accessibilityRole="header" numberOfLines={2}>
          {greeting}
        </AppText>
        <View style={styles.pill} accessible accessibilityLabel={`${streak} ${t("home.streakLabel")}`}>
          <MaterialCommunityIcons name="fire" size={20} color={palette.brand.primary} />
          <AppText variant="number" align="ltr" color={palette.brand.primary}>
            {streak}
          </AppText>
        </View>
        <View style={styles.pill} accessible accessibilityLabel={`${xpTotal} ${t("home.xpLabel")}`}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color={palette.brand.js} />
          <AppText variant="number" align="ltr" color={palette.brand.js}>
            {xpTotal}
          </AppText>
        </View>
      </View>
      <View style={styles.levelRow} accessible accessibilityLabel={t("home.levelProgress", { current: level.xpIntoLevel, total: level.xpForNextLevel, next: level.level + 1 })}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("home.levelLabel", { level: level.level })}
        </AppText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.md },
  topRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  greeting: { flex: 1 },
  pill: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.pill, backgroundColor: palette.bg.surface },
  levelRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  track: { flex: 1, height: 8, borderRadius: radii.pill, backgroundColor: palette.bg.raised, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: palette.brand.js },
});
