import { StyleSheet } from "react-native";
import { TRACKS, type Track } from "@project/content-model";
import { JUMP_TEST_LENGTH, jumpTestPassMark } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";

/** A locked track's way in (PRD 6.2): finish the track before it, or pass its jump test. */
export function JumpTestCard({ track, onStart }: { track: Track; onStart: () => void }) {
  const previous = TRACKS[TRACKS.indexOf(track) - 1];
  return (
    <Surface style={styles.card}>
      <AppText color={palette.text.secondary}>{t("map.trackLocked")}</AppText>
      <AppText variant="label" color={palette.text.muted}>
        {t("map.jumpBody", { count: JUMP_TEST_LENGTH, previous: t(`map.track.${previous}`), pass: jumpTestPassMark(JUMP_TEST_LENGTH), track: t(`map.track.${track}`) })}
      </AppText>
      <OutlineButton label={t("map.jumpTest")} onPress={onStart} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
});
