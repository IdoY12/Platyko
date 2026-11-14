import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { checkItemAnswer, type Item } from "@project/content-model";
import { ContentText } from "@/components/common/AppText/ContentText";
import { CodeView } from "@/components/common/CodeView/CodeView";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OptionList } from "@/components/lesson/OptionList";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { cacheLesson, recordAttempt } from "@/redux/learning-slice";
import ContentService from "@/services/auth-aware/ContentService";
import { haptic } from "@/theme/haptics";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

/** The very first lesson of the bank; its first output question is the learner's first taste (PRD 16.2). */
const FIRST_LESSON_ID = "values-and-types.lesson-1";

type Props = { onDone: () => void };

/**
 * One easy PREDICT_OUTPUT before anything else is asked, so the product is felt within twenty
 * seconds. The answer counts as a real attempt. Offline, the step skips itself.
 */
export function FirstItemStep({ onDone }: Props) {
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const [item, setItem] = useState<Item | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [checkedCorrect, setCheckedCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    new ContentService()
      .getLesson(FIRST_LESSON_ID)
      .then((lesson) => {
        if (cancelled) return;
        dispatch(cacheLesson(lesson));
        const first = lesson.items.find((candidate) => candidate.format === "PREDICT_OUTPUT");
        if (first) setItem(first);
        else onDone();
      })
      .catch(() => {
        if (!cancelled) onDone();
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, onDone]);

  if (!item) return <ActivityIndicator color={palette.brand.primary} style={styles.loading} />;

  const check = () => {
    if (selected === null) return;
    const verdict = checkItemAnswer(item, { kind: "option", optionIndex: selected });
    dispatch(
      recordAttempt({
        attempt: {
          clientAttemptId: randomUUID(),
          itemId: item.id,
          itemVersion: item.version,
          correct: verdict.correct,
          attemptNo: 1,
          optionIndex: selected,
          usedHint: 0,
          context: "LESSON",
          lessonId: null,
          answeredAt: new Date().toISOString(),
        },
        concept: item.concept,
        today: getStreakCalendarDate(),
        isGuest,
      }),
    );
    if (verdict.correct) haptic.success();
    else haptic.error();
    setCheckedCorrect(verdict.correct);
  };

  const rightIndex = item.options?.findIndex((option) => option.correct) ?? -1;
  const verdicts = checkedCorrect === null || selected === null ? {} : { [selected]: checkedCorrect ? "correct" : "wrong", [rightIndex]: "correct" } as const;

  return (
    <View style={styles.step}>
      <ContentText variant="cardTitle">{item.prompt}</ContentText>
      {item.code ? <CodeView lines={item.code} /> : null}
      <OptionList options={(item.options ?? []).map((option) => option.text)} selectedIndex={selected} verdicts={verdicts} optionsAreCode disabled={checkedCorrect !== null} onSelect={setSelected} />
      {checkedCorrect !== null ? <ContentText color={palette.text.secondary}>{checkedCorrect ? item.explanation : item.options?.[selected ?? 0]?.feedback ?? item.explanation}</ContentText> : null}
      {checkedCorrect === null ? (
        <LipButton label={t("lesson.check")} disabled={selected === null} onPress={check} />
      ) : (
        <LipButton label={t("lesson.continue")} tone={checkedCorrect ? "success" : "primary"} onPress={onDone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: space.lg },
  loading: { marginTop: space.xxxl },
});
