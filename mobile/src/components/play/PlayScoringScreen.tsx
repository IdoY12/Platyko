import { StyleSheet, View } from "react-native";
import { MAX_ATTEMPTS_PER_ROUND, MAX_LATENCY_CREDIT_MS, PLACEMENT_GAMES, pointsForAnswer } from "@project/match-engine";
import type { MessageKey } from "@project/locales";
import { UNRATED_MATCH_XP_GAMES_PER_DAY } from "@project/xp-constants";
import { AppText } from "@/components/common/AppText/AppText";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { getActiveLanguage, t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";

/** Worked examples, scored by the same function the server uses, so the screen cannot drift from the rules. */
const EXAMPLES: { label: MessageKey; attemptNo: number; timerShare: number }[] = [
  { label: "play.scoringAtOnce", attemptNo: 1, timerShare: 0 },
  { label: "play.scoringHalfway", attemptNo: 1, timerShare: 0.5 },
  { label: "play.scoringLastSecond", attemptNo: 1, timerShare: 1 },
  { label: "play.scoringSecondTry", attemptNo: 2, timerShare: 0.5 },
];
const TIE_BREAKERS: MessageKey[] = ["play.scoringTieOne", "play.scoringTieTwo", "play.scoringTieThree", "play.scoringTieFour"];

/** "How scoring works" (PRD 11.5): the points formula with examples, the tie-breakers and what ranked games change. */
export function PlayScoringScreen() {
  const numberFormat = new Intl.NumberFormat(getActiveLanguage());
  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("play.scoring")} />
      <AppText color={palette.text.secondary}>{t("play.scoringIntro")}</AppText>

      <Surface style={styles.card}>
        <AppText variant="cardTitle" accessibilityRole="header">
          {t("play.scoringRight")}
        </AppText>
        <AppText color={palette.text.secondary}>{t("play.scoringRightBody")}</AppText>
        {EXAMPLES.map((example) => {
          const points = pointsForAnswer({ correct: true, attemptNo: example.attemptNo, responseMs: example.timerShare, timerMs: 1 });
          return (
            <View key={example.label} style={styles.row} accessible accessibilityLabel={`${t(example.label)}: ${numberFormat.format(points)}`}>
              <AppText style={styles.rowLabel}>{t(example.label)}</AppText>
              <AppText variant="bodyStrong" color={palette.brand.glow}>
                {numberFormat.format(points)}
              </AppText>
            </View>
          );
        })}
        <AppText color={palette.text.secondary}>{t("play.scoringNothing", { tries: MAX_ATTEMPTS_PER_ROUND })}</AppText>
        <AppText color={palette.text.secondary}>{t("play.scoringTime", { ms: MAX_LATENCY_CREDIT_MS })}</AppText>
      </Surface>

      <Surface style={styles.card}>
        <AppText variant="cardTitle" accessibilityRole="header">
          {t("play.scoringTies")}
        </AppText>
        {TIE_BREAKERS.map((rule, index) => (
          <View key={rule} style={styles.row}>
            <AppText variant="bodyStrong" color={palette.brand.glow}>
              {index + 1}
            </AppText>
            <AppText style={styles.rowLabel}>{t(rule)}</AppText>
          </View>
        ))}
        <AppText color={palette.text.secondary}>{t("play.scoringLeft")}</AppText>
      </Surface>

      <Surface style={styles.card}>
        <AppText variant="cardTitle" accessibilityRole="header">
          {t("play.scoringRanked")}
        </AppText>
        <AppText color={palette.text.secondary}>{t("play.scoringRankedBody", { games: PLACEMENT_GAMES, xpGames: UNRATED_MATCH_XP_GAMES_PER_DAY })}</AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  card: { gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowLabel: { flex: 1 },
});
