import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TRACKS, type Track } from "@project/content-model";
import { t } from "@/i18n/translate";
import { useAppDispatch } from "@/redux/hooks";
import { outgoingInviteChanged } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { playRequest } from "./playRequest";

/** A duel invitation is open for a minute (PRD 11.3). */
const DUEL_INVITE_MS = 60_000;

/**
 * Invites a friend to a friends duel (PRD 11.4): the inviter picks the track, then waits on the
 * Play tab until the friend answers or the minute runs out.
 */
export function useInviteToDuel(): (friend: { id: string; username: string }) => void {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootNavigation>();
  const send = async (friend: { id: string; username: string }, track: Track) => {
    const reply = await playRequest(() => playService.inviteToDuel(friend.id, track));
    if (!reply?.inviteId) return;
    dispatch(outgoingInviteChanged({ inviteId: reply.inviteId, username: friend.username, expiresAt: Date.now() + DUEL_INVITE_MS }));
    navigation.navigate("MainTabs", { screen: "PlayTab" });
  };
  return (friend) =>
    Alert.alert(t("play.inviteToDuel"), t("play.chooseTrack"), [
      ...TRACKS.map((track) => ({ text: t(`map.track.${track}`), onPress: () => void send(friend, track) })),
      { text: t("common.cancel"), style: "cancel" as const },
    ]);
}
