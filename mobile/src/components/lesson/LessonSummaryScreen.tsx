import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { nextLessonId } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Screen } from "@/components/common/Screen/Screen";
import { Surface } from "@/components/common/Surface/Surface";
import { Mascot } from "@/components/mascot/Mascot";
import { useAppSelector } from "@/redux/hooks";
import { learnerProgressOf } from "@/redux/learning-selectors";
import { t } from "@/i18n/translate";
import { duration, palette, space } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/rootNavigation.types";

type Props = NativeStackScreenProps<RootStackParamList, "LessonSummary">;

function Stat({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <Surface style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="number" align="ltr" color={colour} style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="label" color={palette.text.secondary}>
        {label}
      </AppText>
    </Surface>
  );
}

/** The end of a lesson (PRD 16.3): the mascot releases the XP from its cheeks, then real accuracy, XP and streak. */
export function LessonSummaryScreen({ route, navigation }: Props) {
  const { accuracy, xpEarned, flawless, concepts } = route.params;
  const map = useAppSelector((state) => state.learning.map);
  const progress = useAppSelector((state) => state.learning.progress);
  const resume = useAppSelector((state) => state.learning.resume);
  const next = map ? nextLessonId(map.units, learnerProgressOf(progress, resume)) : null;
  const conceptTitles = concepts.map((concept) => map?.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.concept === concept)?.title ?? concept);

  return (
    <Screen ambient scrollable contentStyle={styles.content}>
      <View style={styles.mascot}>
        <Mascot state={flawless ? "glow" : "cheer"} streakLength={progress.streak.current} mood={accuracy >= 80 ? 1 : 0} />
      </View>
      <Animated.View entering={FadeInUp.delay(duration.emphasis).duration(duration.transition)} style={styles.body}>
        <AppText variant="screenTitle" align="center" accessibilityRole="header">
          {t("summary.title")}
        </AppText>
        {flawless ? (
          <AppText variant="bodyStrong" align="center" color={palette.brand.glow}>
            {t("summary.flawless")}
          </AppText>
        ) : null}
        <View style={styles.stats}>
          <Stat label={t("summary.accuracy")} value={`${accuracy}%`} colour={palette.state.success} />
          <Stat label={t("summary.xp")} value={`+${xpEarned}`} colour={palette.brand.js} />
          <Stat label={t("summary.streak")} value={t("summary.days", { count: progress.streak.current })} colour={palette.brand.primary} />
        </View>
        {conceptTitles.length > 0 ? (
          <Surface style={styles.concepts}>
            <AppText variant="label" color={palette.text.secondary}>
              {t("summary.concepts")}
            </AppText>
            {conceptTitles.map((title) => (
              <AppText key={title} variant="bodyStrong" align="ltr">
                {title}
              </AppText>
            ))}
          </Surface>
        ) : null}
        {next ? <LipButton label={t("summary.nextLesson")} onPress={() => navigation.replace("LessonPlayer", { lessonId: next })} /> : null}
        <OutlineButton label={t("summary.backToMap")} onPress={() => navigation.goBack()} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.xl },
  mascot: { width: "70%", alignSelf: "center" },
  body: { gap: space.lg },
  stats: { flexDirection: "row", gap: space.sm },
  stat: { flex: 1, alignItems: "center", gap: space.xs, padding: space.md },
  statValue: { fontSize: 22, lineHeight: 28 },
  concepts: { gap: space.sm },
});
