import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TRACKS, type Track } from "@project/content-model";
import { GAME_MODES, GAME_VARIANTS, ROOM_CODE_LENGTH, isRoomCode, type GameVariant } from "@project/match-engine";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { SegmentedChoice } from "@/components/common/SegmentedChoice/SegmentedChoice";
import { Surface } from "@/components/common/Surface/Surface";
import { TextField } from "@/components/common/TextField/TextField";
import { t } from "@/i18n/translate";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { queueStatus } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { InviteCard } from "./InviteCard";
import { playRequest } from "./playRequest";

const ROOM_ROUNDS = GAME_MODES.room.rounds;
const ROOM_PLAYERS = [2, 3, 4] as const;
const VARIANTS = Object.keys(GAME_VARIANTS) as GameVariant[];

/** The Play tab's start (PRD 11.3–11.7): open invitations, a ranked duel on a track, or a private room by code. */
export function PlayHome() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootNavigation>();
  const { connected, interrupted, invites } = useAppSelector((state) => state.play);
  const startingTrack = useAppSelector((state) => state.learning.startingTrack);
  const [track, setTrack] = useState<Track>(startingTrack ?? "BEGINNER");
  const [variant, setVariant] = useState<GameVariant>("classic");
  const [rounds, setRounds] = useState<number>(ROOM_ROUNDS[0]);
  const [maxPlayers, setMaxPlayers] = useState<number>(ROOM_PLAYERS[2]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (send: () => Promise<{ ok?: boolean; code?: string } | null>) => {
    setBusy(true);
    await send();
    setBusy(false);
  };

  const findMatch = () =>
    run(async () => {
      const reply = await playRequest(() => playService.joinQueue(track));
      if (reply) dispatch(queueStatus({ searching: true, waitedMs: 0, ghostOffered: false }));
      return reply;
    });

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("play.title")} />
      {!connected ? <AppText color={palette.text.muted}>{t("play.offline")}</AppText> : null}
      {interrupted ? <AppText color={palette.brand.js}>{t("play.interrupted")}</AppText> : null}
      {invites.length > 0 ? (
        <View style={styles.group}>
          <AppText variant="label" color={palette.text.secondary} accessibilityRole="header">
            {t("play.invites")}
          </AppText>
          {invites.map((invite) => (
            <Surface key={invite.inviteId} style={styles.card}>
              <InviteCard invite={invite} />
            </Surface>
          ))}
        </View>
      ) : null}

      <View style={styles.group}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("play.track")}
        </AppText>
        <SegmentedChoice options={TRACKS.map((value) => ({ value, label: t(`map.track.${value}`) }))} selected={track} onSelect={setTrack} />
      </View>

      <Surface style={styles.card}>
        <AppText variant="cardTitle">{t("play.ranked")}</AppText>
        <AppText color={palette.text.secondary}>{t("play.rankedBody")}</AppText>
        <LipButton label={t("play.find")} onPress={() => void findMatch()} disabled={!connected} loading={busy} />
      </Surface>

      <Surface style={styles.card}>
        <AppText variant="cardTitle">{t("play.room")}</AppText>
        <AppText color={palette.text.secondary}>{t("play.roomBody")}</AppText>
        <AppText variant="label" color={palette.text.secondary}>
          {t("play.variant")}
        </AppText>
        <SegmentedChoice options={VARIANTS.map((value) => ({ value, label: t(`play.variant.${value}`) }))} selected={variant} onSelect={setVariant} />
        <AppText variant="label" color={palette.text.muted}>
          {t(`play.variantBody.${variant}`)}
        </AppText>
        <AppText variant="label" color={palette.text.secondary}>
          {t("play.rounds")}
        </AppText>
        <SegmentedChoice options={ROOM_ROUNDS.map((value) => ({ value: String(value), label: String(value) }))} selected={String(rounds)} onSelect={(value) => setRounds(Number(value))} />
        <AppText variant="label" color={palette.text.secondary}>
          {t("play.players")}
        </AppText>
        <SegmentedChoice options={ROOM_PLAYERS.map((value) => ({ value: String(value), label: String(value) }))} selected={String(maxPlayers)} onSelect={(value) => setMaxPlayers(Number(value))} />
        <OutlineButton label={t("play.create")} disabled={!connected || busy} onPress={() => void run(() => playRequest(() => playService.createRoom({ track, variant, rounds, maxPlayers })))} />
        <View style={styles.codeRow}>
          <TextField value={code} onChangeText={(text) => setCode(text.toUpperCase())} placeholder={t("play.codePlaceholder")} accessibilityLabel={t("play.codePlaceholder")} autoCapitalize="characters" autoCorrect={false} maxLength={ROOM_CODE_LENGTH} code style={styles.codeField} />
          <OutlineButton label={t("play.join")} disabled={!connected || busy || !isRoomCode(code)} onPress={() => void run(() => playRequest(() => playService.joinRoom(code)))} />
        </View>
      </Surface>

      <TextButton label={t("play.scoring")} onPress={() => navigation.navigate("PlayScoring")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  group: { gap: space.sm },
  card: { gap: space.md },
  codeRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
  codeField: { flex: 1 },
});
