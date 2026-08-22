import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { resetBlockProgress, setExerciseIndex as setSavedExerciseIndex } from "@/redux/lesson-slice";
import { addXp as addXpAction } from "@/redux/xp-slice";
import { hydrateStreak, runStreakAppOpen, runStreakQualifyingExercise } from "@/redux/streak-slice";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import type { Experience } from "@/redux/profile-slice";
import type { LessonScreenNavigation } from "@/types/learnNavigation.types";
import { orchestrateLessonAnswer } from "@/utils/lessonAnswerOrchestrator";

type Load = {
  exercises: { length: number };
  exerciseIndex: number;
  correctCount: number;
  attemptedCount: number;
  setAttemptedCount: (n: number | ((p: number) => number)) => void;
  setCorrectCount: (n: number | ((p: number) => number)) => void;
  setExerciseIndex: (n: number | ((p: number) => number)) => void;
};

export function useLessonExerciseCompleteHandler(
  navigation: LessonScreenNavigation,
  experienceLevel: Experience,
  lessonTitle: string,
  blockIndex: number,
  load: Load,
) {
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const addXp = useCallback((n: number) => dispatch(addXpAction(n)), [dispatch]);

  const onQualifyingLessonXpEarned = useCallback(() => {
    if (!isGuest) return;
    const today = getStreakCalendarDate();
    dispatch(runStreakAppOpen({ today }));
    dispatch(runStreakQualifyingExercise({ today }));
  }, [dispatch, isGuest]);

  return useCallback(
    (_answer: string, completion: LessonExerciseCompletionContext) => {
      orchestrateLessonAnswer({
        completion,
        addXp,
        onQualifyingLessonXpEarned,
        exercisesLength: load.exercises.length,
        exerciseIndex: load.exerciseIndex,
        correctCount: load.correctCount,
        attemptedCount: load.attemptedCount,
        lessonTitle,
        experienceLevel,
        navigation,
        setAttemptedCount: load.setAttemptedCount,
        setCorrectCount: load.setCorrectCount,
        setExerciseIndex: load.setExerciseIndex,
      });

      if (!isGuest && typeof completion.submitResult.streakCurrent === "number") {
        const today = getStreakCalendarDate();
        dispatch(
          hydrateStreak({
            streakCurrent: completion.submitResult.streakCurrent,
            lastActivityDate: today,
            lastCheckedDate: today,
          }),
        );
      }

      if (load.exerciseIndex + 1 >= load.exercises.length) {
        dispatch(setSavedExerciseIndex(0));
        dispatch(resetBlockProgress({ level: experienceLevel, blockIndex }));
      }
    },
    [
      addXp,
      onQualifyingLessonXpEarned,
      blockIndex,
      isGuest,
      load.attemptedCount,
      load.correctCount,
      load.exerciseIndex,
      load.exercises.length,
      load.setAttemptedCount,
      load.setCorrectCount,
      load.setExerciseIndex,
      lessonTitle,
      navigation,
      experienceLevel,
      dispatch,
    ],
  );
}
