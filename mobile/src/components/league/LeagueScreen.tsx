import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { StandingRow } from "@/components/common/StandingRow/StandingRow";
import { getActiveLanguage, t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import { palette, space } from "@/theme/tokens";
import { useLeague } from "./useLeague";

/** The learner's league group this week (PRD 14.5), ranked by the XP each member earned. */
export function LeagueScreen() {
  const { league } = useLeague();
  const userId = useAppSelector((state) => state.session.userId);
  const weekEnd = league && league.status !== "left" ? new Intl.DateTimeFormat(getActiveLanguage(), { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${league.weekEnd}T12:00:00Z`)) : null;

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("league.title")} />
      <AppText color={palette.text.secondary}>{t("league.body")}</AppText>
      {weekEnd ? <AppText variant="label" color={palette.brand.glow}>{t("league.weekEnds", { date: weekEnd })}</AppText> : null}
      {league?.status === "left" ? <AppText color={palette.text.secondary}>{t("league.left")}</AppText> : null}
      {league?.status === "waiting" ? <AppText color={palette.text.secondary}>{t("league.waiting")}</AppText> : null}
      {league?.status === "active" ? (
        <View style={styles.list}>
          {league.standings.map((standing) => (
            <StandingRow
              key={standing.id}
              place={standing.rank}
              name={standing.username}
              avatarUrl={standing.avatarUrl}
              value={standing.weeklyXp}
              accessibilityLabel={`${t("play.place", { place: standing.rank })}, ${standing.username}, ${t("league.weeklyXp", { xp: standing.weeklyXp })}`}
              isSelf={standing.id === userId}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  list: { gap: space.sm },
});
