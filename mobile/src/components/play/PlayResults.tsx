import { StyleSheet, View } from "react-native";
import type { MatchEndEvent, MatchStartEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Screen } from "@/components/common/Screen/Screen";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { leavePlay, queueStatus } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import { playRequest } from "./playRequest";
import { PlayStandings } from "./PlayStandings";

/** The end of a game (PRD 11.4): the final places, the rating change of a ranked game, and the XP. */
export function PlayResults({ match, end }: { match: MatchStartEvent; end: MatchEndEvent }) {
  const dispatch = useAppDispatch();
  const selfId = useAppSelector((state) => state.session.userId);
  const own = end.standings.find((standing) => standing.userId === selfId);
  const sharedFirst = end.standings.filter((standing) => standing.place === 1).length > 1;
  const headline = own?.place === 1 ? t(sharedFirst ? "play.draw" : "play.youWon") : t("play.place", { place: own?.place ?? end.standings.length });
  const signedChange = end.ratingChange === null ? null : `${end.ratingChange > 0 ? "+" : ""}${end.ratingChange}`;
  const playAgain = async () => {
    dispatch(leavePlay());
    const reply = await playRequest(() => playService.joinQueue(match.track));
    if (reply) dispatch(queueStatus({ searching: true, waitedMs: 0, ghostOffered: false }));
  };

  return (
    <Screen scrollable contentStyle={styles.content}>
      <AppText variant="display" align="center" color={own?.place === 1 && !sharedFirst ? palette.brand.js : palette.text.primary}>
        {headline}
      </AppText>
      <Surface style={styles.summary}>
        <AppText variant="number" align="center">
          {t("play.score", { points: own?.points ?? 0 })}
        </AppText>
        <View style={styles.rewards}>
          {signedChange ? <AppText variant="bodyStrong" color={palette.brand.glow}>{t("play.ratingChange", { change: signedChange })}</AppText> : null}
          {end.xpEarned > 0 ? <AppText variant="bodyStrong" color={palette.state.success}>{t("play.xp", { xp: end.xpEarned })}</AppText> : null}
        </View>
      </Surface>
      <AppText variant="label" color={palette.text.secondary}>
        {t("play.results")}
      </AppText>
      <PlayStandings standings={end.standings} seats={match.seats} selfId={selfId} />
      {match.mode !== "room" ? <LipButton label={t("play.again")} onPress={() => void playAgain()} /> : null}
      <OutlineButton label={t("play.backToPlay")} onPress={() => dispatch(leavePlay())} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, paddingTop: space.xxl },
  summary: { gap: space.md },
  rewards: { flexDirection: "row", justifyContent: "center", gap: space.xl },
});
