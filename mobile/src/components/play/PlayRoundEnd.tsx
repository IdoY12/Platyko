import { StyleSheet, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import type { MatchStartEvent, RoundEndEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import { bottomSheet, palette, radii, space, springs, wash } from "@/theme/tokens";
import { PlayStandings } from "./PlayStandings";

/** A long right answer (a whole program) is cut to this many lines; the item above shows the rest. */
const RIGHT_ANSWER_LINES = 4;

/**
 * The few seconds between rounds (PRD 11.7): the right answer and everyone's standing, pinned to
 * the bottom so they are seen without scrolling, whatever the length of the item above.
 */
export function PlayRoundEnd({ match, roundEnd }: { match: MatchStartEvent; roundEnd: RoundEndEvent }) {
  const selfId = useAppSelector((state) => state.session.userId);
  return (
    <Animated.View entering={SlideInDown.springify().duration(springs.sheet.duration).dampingRatio(springs.sheet.dampingRatio)} style={styles.sheet}>
      {roundEnd.rightText ? (
        <View style={styles.rightAnswer}>
          <AppText variant="label" color={palette.text.secondary}>
            {t("play.rightAnswer")}
          </AppText>
          <AppText variant="codeSmall" align="ltr" numberOfLines={RIGHT_ANSWER_LINES}>
            {roundEnd.rightText}
          </AppText>
        </View>
      ) : null}
      <AppText variant="label" color={palette.text.secondary} accessibilityRole="header">
        {t("play.standings")}
      </AppText>
      <PlayStandings standings={roundEnd.standings} seats={match.seats} selfId={selfId} roundPoints={roundEnd.points} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { ...bottomSheet, borderTopColor: palette.brand.glow },
  rightAnswer: { gap: space.xs, padding: space.md, borderRadius: radii.button, backgroundColor: wash.success },
});
