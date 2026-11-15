import { ActivityIndicator, StyleSheet } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Screen } from "@/components/common/Screen/Screen";
import { t } from "@/i18n/translate";
import { useAppDispatch } from "@/redux/hooks";
import { outgoingInviteChanged, type OutgoingInvite } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import { usePlayClock } from "./usePlayClock";

/** A duel invitation is open for a minute (PRD 11.3). */
const LONGEST_DUEL_INVITE_MS = 60_000;

/** Waiting for a friend to answer a duel invitation; the game opens the moment they accept. */
export function PlayInviteWaiting({ invite }: { invite: OutgoingInvite }) {
  const dispatch = useAppDispatch();
  const remainingMs = usePlayClock(invite.expiresAt, LONGEST_DUEL_INVITE_MS);
  const cancel = () => {
    playService.cancelInvite();
    dispatch(outgoingInviteChanged(null));
  };
  return (
    <Screen contentStyle={styles.content}>
      <ActivityIndicator size="large" color={palette.brand.primary} />
      <AppText variant="cardTitle" align="center">
        {t("play.waitingFor", { name: invite.username })}
      </AppText>
      <AppText variant="bodyStrong" align="center" color={palette.text.muted} accessibilityLiveRegion="polite" style={styles.countdown}>
        {t("play.secondsLeft", { seconds: Math.ceil(remainingMs / 1000) })}
      </AppText>
      <OutlineButton label={t("play.cancelInvite")} onPress={cancel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Words in the UI font (the code font has no Hebrew); digits of equal width so the count does not jitter.
  countdown: { fontVariant: ["tabular-nums"] },
  content: { flex: 1, justifyContent: "center", gap: space.xl },
});
