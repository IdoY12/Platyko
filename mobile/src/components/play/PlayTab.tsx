import { StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import { palette, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { PlayHome } from "./PlayHome";
import { PlayInviteWaiting } from "./PlayInviteWaiting";
import { PlayLobby } from "./PlayLobby";
import { PlayMatch } from "./PlayMatch";
import { PlayQueue } from "./PlayQueue";
import { PlayResults } from "./PlayResults";

/**
 * The Play tab. What it shows follows the server's picture of the learner's game, so a reconnect
 * or a return to the tab lands on the right screen: results, a running game, a room, the queue,
 * a duel invitation waiting for an answer, or the start. Guests are asked to sign in, since games
 * and ratings live on an account.
 */
export function PlayTab() {
  const navigation = useNavigation<RootNavigation>();
  const isAuthenticated = useAppSelector((state) => state.session.isAuthenticated);
  const { queue, lobby, match, end, outgoingInvite } = useAppSelector((state) => state.play);

  if (!isAuthenticated) {
    return (
      <Screen contentStyle={styles.guest}>
        <ScreenHeader title={t("play.title")} />
        <AppText color={palette.text.secondary}>{t("play.guest")}</AppText>
        <LipButton label={t("play.signIn")} onPress={() => navigation.navigate("Auth")} />
      </Screen>
    );
  }
  if (match && end?.matchId === match.matchId) return <PlayResults match={match} end={end} />;
  if (match) return <PlayMatch match={match} />;
  if (lobby) return <PlayLobby lobby={lobby} />;
  if (queue?.searching) return <PlayQueue queue={queue} />;
  if (outgoingInvite) return <PlayInviteWaiting invite={outgoingInvite} />;
  return <PlayHome />;
}

const styles = StyleSheet.create({
  guest: { gap: space.xl },
});
