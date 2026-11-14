import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { conceptsDueForReview, dailyChallengeId, nextLessonId, summaryLessonId } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Screen } from "@/components/common/Screen/Screen";
import { Surface } from "@/components/common/Surface/Surface";
import { REVIEW_SESSION_ID } from "@/components/lesson/useLessonPlayer";
import { Mascot } from "@/components/mascot/Mascot";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import store from "@/redux/store";
import { learnerProgressOf } from "@/redux/learning-selectors";
import { refreshContentMap, syncLearningProgress } from "@/redux/learning-sync";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, radii, space, wash } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { HomeDailyChallenge } from "./HomeDailyChallenge";
import { HomeStatsHeader } from "./HomeStatsHeader";
import { HomeWeekRow } from "./HomeWeekRow";
import { homeMascotState } from "./homeMascotState";

/** The day the mascot last waved, so it greets once per day rather than on every visit. */
let wavedOnDate: string | null = null;

function greetingKey(hour: number) {
  if (hour < 12) return "home.greetingMorning" as const;
  return hour < 18 ? ("home.greetingAfternoon" as const) : ("home.greetingEvening" as const);
}

/**
 * Home (PRD 16.9): who you are on the river today — streak, XP and level, the mascot reacting to
 * the streak, the week, then one primary action: "Continue" opens the next lesson directly.
 */
export function HomeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const dispatch = useAppDispatch();
  const username = useAppSelector((state) => state.profile.username);
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const { map, progress, resume, goals } = useAppSelector((state) => state.learning);
  const today = getStreakCalendarDate();
  const firstVisitToday = wavedOnDate !== today;

  useFocusEffect(
    useCallback(() => {
      void refreshContentMap(dispatch);
      void syncLearningProgress(dispatch, () => store.getState());
      return () => {
        wavedOnDate = getStreakCalendarDate();
      };
    }, [dispatch]),
  );

  const next = useMemo(() => {
    if (!map) return null;
    const lessonId = nextLessonId(map.units, learnerProgressOf(progress, resume));
    if (!lessonId) return null;
    const unit = map.units.find((candidate) => candidate.lessons.some((lesson) => lesson.id === lessonId));
    const lesson = unit?.lessons.find((candidate) => candidate.id === lessonId);
    const done = unit?.lessons.filter((candidate) => progress.completedLessons.some((completed) => completed.lessonId === candidate.id)).length ?? 0;
    const lessonTitle = lessonId === summaryLessonId(unit?.unit ?? "") ? t("map.summaryLesson") : lesson?.title ?? "";
    return { lessonId, unitTitle: unit?.title ?? "", lessonTitle, done, total: unit?.lessons.length ?? 1, resuming: resume?.lessonId === lessonId };
  }, [map, progress, resume]);

  const dueCount = conceptsDueForReview(progress, today).length;
  const practisedDates = useMemo(() => new Set(progress.practiceDays.filter((day) => day.itemsAnswered > 0).map((day) => day.date)), [progress.practiceDays]);
  const greeting = t(greetingKey(new Date().getHours()));
  const mascotState = homeMascotState(new Date(), progress.streak, today, firstVisitToday);

  return (
    <Screen ambient scrollable>
      <HomeStatsHeader greeting={isGuest ? greeting : t("home.greetingNamed", { greeting, name: username })} streak={progress.streak.current} xpTotal={progress.xpTotal} />
      <View style={styles.mascot}>
        <Mascot state={mascotState} streakLength={progress.streak.current} mood={0} />
      </View>
      {progress.streak.freezes > 0 ? (
        <AppText variant="label" color={palette.brand.glow} align="center">
          {t("home.freezes", { count: progress.streak.freezes })}
        </AppText>
      ) : null}
      <HomeWeekRow practisedDates={practisedDates} today={today} goalDays={goals.weeklyGoalDays} />

      <Surface level="raised" style={styles.continueCard}>
        <AppText variant="label" color={palette.brand.primary}>
          {t("home.continueTitle")}
        </AppText>
        {next ? (
          <>
            <AppText variant="cardTitle" align="ltr">
              {t("home.continueLesson", { unit: next.unitTitle, lesson: next.lessonTitle })}
            </AppText>
            <View style={styles.unitTrack} accessibilityLabel={t("map.unitProgress", { done: next.done, total: next.total })}>
              <View style={[styles.unitFill, { width: `${Math.round((next.done / next.total) * 100)}%` }]} />
            </View>
            <LipButton label={next.resuming ? t("home.continueAction") : t("home.startAction")} onPress={() => navigation.navigate("LessonPlayer", { lessonId: next.lessonId })} />
          </>
        ) : (
          <AppText color={palette.text.secondary}>{map ? t("home.allDone") : t("home.mapLoading")}</AppText>
        )}
      </Surface>

      {dueCount > 0 ? (
        <Surface style={styles.reviewCard}>
          <MaterialCommunityIcons name="refresh" size={28} color={palette.brand.glow} />
          <View style={styles.reviewText}>
            <AppText variant="cardTitle">{t("home.reviewTitle")}</AppText>
            <AppText color={palette.text.secondary}>{t("home.reviewDue", { count: dueCount })}</AppText>
          </View>
          <PressableScale accessibilityRole="button" accessibilityLabel={t("home.reviewAction")} onPress={() => navigation.navigate("LessonPlayer", { lessonId: REVIEW_SESSION_ID })} style={styles.reviewButton}>
            <MaterialCommunityIcons name="play" size={24} color={palette.text.onBright} />
          </PressableScale>
        </Surface>
      ) : null}
      {map ? (
        <HomeDailyChallenge
          todayResult={progress.dailyChallenges.find((result) => result.date === today) ?? null}
          onPlay={() => navigation.navigate("LessonPlayer", { lessonId: dailyChallengeId(today) })}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mascot: { width: "62%", alignSelf: "center", marginVertical: -space.md },
  continueCard: { gap: space.md },
  unitTrack: { height: 8, borderRadius: radii.pill, backgroundColor: palette.bg.surface, overflow: "hidden" },
  unitFill: { height: "100%", borderRadius: radii.pill, backgroundColor: palette.brand.primary },
  reviewCard: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: wash.glow },
  reviewText: { flex: 1, gap: space.xs },
  reviewButton: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: palette.brand.glow },
});
