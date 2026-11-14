import { Share, StyleSheet, View } from "react-native";
import type { LobbyEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { UserRow } from "@/components/social/UserRow";
import { t } from "@/i18n/translate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { lobbyChanged } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space, typography } from "@/theme/tokens";
import { roomLink } from "@/config/appLinks";
import { LobbyInvites } from "./LobbyInvites";
import { playRequest } from "./playRequest";

/** A private room before the game (PRD 11.7): the code to share, who is in and ready, and the host's controls. */
export function PlayLobby({ lobby }: { lobby: LobbyEvent }) {
  const dispatch = useAppDispatch();
  const selfId = useAppSelector((state) => state.session.userId);
  const isHost = lobby.hostId === selfId;
  const selfReady = lobby.players.find((player) => player.userId === selfId)?.ready ?? false;
  const canStart = lobby.players.length >= 2 && lobby.players.every((player) => player.ready);
  const leave = () => {
    playService.leaveRoom();
    dispatch(lobbyChanged(null));
  };

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("play.lobby")} />
      <Surface style={styles.card}>
        <AppText variant="label" color={palette.text.secondary}>
          {t(`map.track.${lobby.track}`)} · {t("play.roundCount", { count: lobby.rounds })}
        </AppText>
        {/* The code is read out letter by letter and always runs left to right. */}
        <AppText align="ltr" style={styles.code} accessibilityLabel={lobby.code.split("").join(" ")}>
          {lobby.code}
        </AppText>
        <OutlineButton label={t("play.shareCode")} onPress={() => void Share.share({ message: t("play.shareMessage", { code: lobby.code, link: roomLink(lobby.code) }) })} />
      </Surface>

      <Surface style={styles.card}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("play.players")} {lobby.players.length}/{lobby.maxPlayers}
        </AppText>
        {lobby.players.map((player) => (
          <UserRow
            key={player.userId}
            user={player}
            actions={
              <View style={styles.actions}>
                <AppText variant="label" color={player.ready ? palette.state.success : palette.text.muted}>
                  {player.userId === lobby.hostId ? `${t("play.host")} · ` : ""}
                  {player.ready ? t("play.ready") : t("play.notReady")}
                </AppText>
                {isHost && player.userId !== selfId ? <TextButton label={t("play.kick")} onPress={() => void playRequest(() => playService.kick(player.userId))} /> : null}
              </View>
            }
          />
        ))}
      </Surface>

      <LobbyInvites lobby={lobby} />

      <AppText color={palette.text.secondary}>{t("play.waitingHost")}</AppText>
      <OutlineButton label={selfReady ? t("play.notReady") : t("play.ready")} onPress={() => playService.setReady(!selfReady)} />
      {isHost ? <LipButton label={t("play.start")} disabled={!canStart} onPress={() => void playRequest(() => playService.startRoom())} /> : null}
      <TextButton label={t("play.leave")} onPress={leave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  card: { gap: space.md },
  code: { ...typography.code, fontSize: 32, lineHeight: 40, letterSpacing: 6, color: palette.brand.js, textAlign: "center" },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
