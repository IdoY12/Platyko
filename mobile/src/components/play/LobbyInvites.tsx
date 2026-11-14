import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import type { LobbyEvent, PublicUser } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { Surface } from "@/components/common/Surface/Surface";
import { UserRow } from "@/components/social/UserRow";
import { t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import SocialService from "@/services/auth-aware/SocialService";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import { logError } from "@/utils/logger";
import { playRequest } from "./playRequest";

/** Friends who are online and not yet in the room, each with an invitation (PRD 11.7). */
export function LobbyInvites({ lobby }: { lobby: LobbyEvent }) {
  const presence = useAppSelector((state) => state.play.presence);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [invited, setInvited] = useState<string[]>([]);
  useEffect(() => {
    new SocialService().getFriends().then((response) => setFriends(response.friends), (error: unknown) => logError("[PLAY]", error, { phase: "lobby-friends" }));
  }, []);
  const inRoom = new Set(lobby.players.map((player) => player.userId));
  const available = friends.filter((friend) => presence[friend.id] === "online" && !inRoom.has(friend.id));
  const invite = async (friend: PublicUser) => {
    const reply = await playRequest(() => playService.inviteToRoom(friend.id));
    if (reply) setInvited((current) => [...current, friend.id]);
  };

  return (
    <Surface style={styles.card}>
      <AppText variant="label" color={palette.text.secondary} accessibilityRole="header">
        {t("play.inviteFriends")}
      </AppText>
      {available.length === 0 ? <AppText color={palette.text.secondary}>{t("play.noFriendsOnline")}</AppText> : null}
      {available.map((friend) => (
        <UserRow
          key={friend.id}
          user={friend}
          actions={
            invited.includes(friend.id) ? (
              <AppText variant="label" color={palette.state.success}>
                {t("play.invited")}
              </AppText>
            ) : (
              <TextButton label={t("play.invite")} onPress={() => void invite(friend)} />
            )
          }
        />
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
});
