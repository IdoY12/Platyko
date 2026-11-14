import { Alert, StyleSheet, View } from "react-native";
import type { MatchStartEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { ProgressSegments } from "@/components/common/ProgressSegments/ProgressSegments";
import { Screen } from "@/components/common/Screen/Screen";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { t } from "@/i18n/translate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { leavePlay } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import { PlayRound } from "./PlayRound";
import { PlayRoundEnd } from "./PlayRoundEnd";
import { usePlayClock } from "./usePlayClock";

/** The server counts down three seconds before the first round. */
const COUNTDOWN_MS = 3000;

/** A running game: the countdown with everyone's seat, then one round after another. */
export function PlayMatch({ match }: { match: MatchStartEvent }) {
  const dispatch = useAppDispatch();
  const { round, roundEnd } = useAppSelector((state) => state.play);
  const current = round?.matchId === match.matchId ? round : null;
  const ended =
    current &&
    roundEnd?.matchId === match.matchId &&
    roundEnd.round === current.round
      ? roundEnd
      : null;
  const leave = () =>
    Alert.alert(t("play.leave"), t("play.leaveConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("play.leave"),
        style: "destructive",
        onPress: () => {
          playService.leaveMatch();
          dispatch(leavePlay());
        },
      },
    ]);

  return (
    <View style={styles.root}>
      <Screen scrollable contentStyle={styles.content}>
        <View style={styles.header}>
          <ProgressSegments
            total={match.rounds}
            completed={current ? current.round + 1 : 0}
            accessibilityLabel={t("play.round", {
              current: (current?.round ?? 0) + 1,
              total: match.rounds,
            })}
          />
          <TextButton label={t("play.leave")} onPress={leave} />
        </View>
        {current ? (
          <PlayRound key={current.round} match={match} round={current} />
        ) : (
          <Countdown match={match} />
        )}
      </Screen>
      {ended ? <PlayRoundEnd match={match} roundEnd={ended} /> : null}
    </View>
  );
}

function Countdown({ match }: { match: MatchStartEvent }) {
  const remainingMs = usePlayClock(match.startsAt, COUNTDOWN_MS);
  return (
    <View style={styles.countdown}>
      {match.ghostOf ? (
        <AppText color={palette.brand.glow} align="center">
          {t("play.ghostLabel", { name: match.ghostOf })}
        </AppText>
      ) : null}
      <View style={styles.seats}>
        {match.seats.map((seat) => (
          <View key={seat.userId} style={styles.seat}>
            <ProfileAvatar
              name={seat.username}
              avatarUrl={seat.avatarUrl}
              size={64}
            />
            <AppText variant="bodyStrong" align="ltr" numberOfLines={1}>
              {seat.username}
            </AppText>
          </View>
        ))}
      </View>
      <AppText
        variant="display"
        align="center"
        accessibilityLiveRegion="polite"
      >
        {t("play.countdown", { seconds: Math.ceil(remainingMs / 1000) })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: space.xl },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  countdown: { gap: space.xxl, paddingTop: space.xxxl },
  seats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.xl,
  },
  seat: { alignItems: "center", gap: space.sm, maxWidth: 120 },
});
