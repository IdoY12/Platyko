import { StyleSheet, View } from "react-native";
import type { InviteEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { t } from "@/i18n/translate";
import { useAppDispatch } from "@/redux/hooks";
import { inviteClosed } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import { playRequest } from "./playRequest";
import { usePlayClock } from "./usePlayClock";

/** A room invitation has no visible clock; a duel's runs for at most a minute. */
const LONGEST_DUEL_INVITE_MS = 60_000;

/** One game invitation (PRD 11.3): who, which game, the time left on a duel, and the two answers. */
export function InviteCard({ invite }: { invite: InviteEvent }) {
  const dispatch = useAppDispatch();
  const remainingMs = usePlayClock(invite.expiresAt, LONGEST_DUEL_INVITE_MS);
  const answer = async (accept: boolean) => {
    dispatch(inviteClosed(invite.inviteId));
    await playRequest(() => playService.answerInvite(invite.inviteId, accept));
  };
  const title = t(invite.kind === "duel" ? "play.inviteDuelFrom" : "play.inviteRoomFrom", { name: invite.from.username });

  return (
    <View style={styles.card} accessible={false}>
      <View style={styles.header}>
        <ProfileAvatar name={invite.from.username} avatarUrl={invite.from.avatarUrl} size={40} />
        <View style={styles.text}>
          <AppText variant="bodyStrong" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="label" color={palette.text.secondary}>
            {t(`map.track.${invite.track}`)}
            {invite.kind === "duel" ? ` · ${t("play.secondsLeft", { seconds: Math.ceil(remainingMs / 1000) })}` : ""}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <TextButton label={t("play.declineInvite")} onPress={() => void answer(false)} />
        <LipButton label={t("play.acceptInvite")} onPress={() => void answer(true)} style={styles.accept} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  text: { flex: 1, gap: 2 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.md },
  accept: { flex: 1 },
});
