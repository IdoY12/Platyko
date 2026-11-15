import { useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import type { QueueStatusEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Screen } from "@/components/common/Screen/Screen";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { useAppDispatch } from "@/redux/hooks";
import { queueStatus } from "@/redux/play-slice";
import { playService } from "@/services/playSocket";
import { palette, space } from "@/theme/tokens";
import { playRequest } from "./playRequest";

/** Waiting for a ranked opponent (PRD 11.6); after a while, a recorded game is offered instead. */
export function PlayQueue({ queue }: { queue: QueueStatusEvent }) {
  const dispatch = useAppDispatch();
  const [noGhost, setNoGhost] = useState(false);
  const stop = () => {
    playService.leaveQueue();
    dispatch(queueStatus(null));
  };
  const playGhost = async () => {
    const reply = await playRequest(() => playService.playGhost());
    if (reply && !reply.ok) setNoGhost(true);
  };

  return (
    <Screen contentStyle={styles.content}>
      <ActivityIndicator size="large" color={palette.brand.primary} />
      <AppText variant="cardTitle" align="center">
        {t("play.searching")}
      </AppText>
      <AppText variant="bodyStrong" align="center" color={palette.text.muted} accessibilityLiveRegion="polite" style={styles.countdown}>
        {t("play.waited", { seconds: Math.floor(queue.waitedMs / 1000) })}
      </AppText>
      {queue.ghostOffered ? (
        <Surface style={styles.card}>
          <AppText color={palette.text.secondary}>{noGhost ? t("play.noGhost") : t("play.ghostOffer")}</AppText>
          {!noGhost ? <LipButton label={t("play.playGhost")} onPress={() => void playGhost()} /> : null}
        </Surface>
      ) : null}
      <OutlineButton label={t("play.cancel")} onPress={stop} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Words in the UI font (the code font has no Hebrew); digits of equal width so the count does not jitter.
  countdown: { fontVariant: ["tabular-nums"] },
  content: { flex: 1, justifyContent: "center", gap: space.xl },
  card: { gap: space.md },
});
