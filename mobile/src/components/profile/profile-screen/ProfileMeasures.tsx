import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ProgressSnapshot } from "@project/learning-logic";
import { tierOf } from "@project/match-engine";
import { levelProgress } from "@project/xp-constants";
import { AppText } from "@/components/common/AppText/AppText";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { palette, radii, space } from "@/theme/tokens";

type MeasureProps = { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; colour: string; value: string; label: string; detail: string };

function Measure({ icon, colour, value, label, detail }: MeasureProps) {
  return (
    <Surface style={styles.measure} accessible accessibilityLabel={`${label}: ${value}, ${detail}`}>
      <MaterialCommunityIcons name={icon} size={22} color={colour} />
      <AppText variant="number" align="ltr" color={colour} style={styles.value}>
        {value}
      </AppText>
      <AppText variant="label">{label}</AppText>
      <AppText variant="label" color={palette.text.muted} numberOfLines={2}>
        {detail}
      </AppText>
    </Surface>
  );
}

/**
 * The three separate measures (PRD 6.8): activity (XP and level), the streak, and competitive skill
 * (the rating and its tier once the placement games are played; how many remain until then).
 */
export function ProfileMeasures({ progress, rating, placementGamesLeft }: { progress: ProgressSnapshot; rating: number | null; placementGamesLeft: number | null }) {
  const ratingDetail = rating !== null ? t(`play.tier.${tierOf(rating)}`) : placementGamesLeft !== null ? t("profile.ratingPlacement", { count: placementGamesLeft }) : "";
  const level = levelProgress(progress.xpTotal);
  return (
    <View style={styles.row}>
      <Measure icon="lightning-bolt" colour={palette.brand.js} value={String(level.level)} label={t("profile.level")} detail={t("profile.xpTotal", { xp: progress.xpTotal })} />
      <Measure icon="fire" colour={palette.brand.primary} value={String(progress.streak.current)} label={t("profile.streak")} detail={`${t("profile.streakBest", { best: progress.streak.best })}\n${t("profile.freezes", { count: progress.streak.freezes })}`} />
      <Measure icon="sword-cross" colour={palette.brand.glow} value={rating === null ? "—" : String(Math.round(rating))} label={t("profile.rating")} detail={ratingDetail} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  measure: { flex: 1, gap: space.xs, padding: space.md, borderRadius: radii.card },
  value: { fontSize: 24, lineHeight: 30 },
});
