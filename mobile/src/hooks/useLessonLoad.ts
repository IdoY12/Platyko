import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { logNav } from "@/utils/logger";
import type Exercise from "@/models/Exercise";
import type { Experience } from "@/redux/profile-slice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  blockProgressKey,
  saveBlockProgress,
  setCurrentExperienceLevel,
  setExerciseIndex as setSavedExerciseIndex,
} from "@/redux/lesson-slice";
import { useLessonPracticeTime } from "@/hooks/useLessonPracticeTime";
import { runLessonExerciseLoad } from "@/utils/runLessonExerciseLoad";

export function useLessonLoad(experienceLevel: Experience, accessToken: string | null, blockIndex: number) {
  const dispatch = useAppDispatch();
  const savedLocalIndex = useAppSelector(
    (s) => s.lesson.blockProgress?.[blockProgressKey(experienceLevel, blockIndex)] ?? 0,
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const isFocused = useIsFocused();

  useEffect(() => {
    logNav("screen:enter", { screen: "LessonScreen", experienceLevel });
    return () => logNav("screen:leave", { screen: "LessonScreen", experienceLevel });
  }, [experienceLevel]);

  useEffect(() => {
    dispatch(setCurrentExperienceLevel(experienceLevel));
    let active = true;
    void runLessonExerciseLoad(experienceLevel, accessToken, blockIndex, savedLocalIndex, () => active, setLoading, {
      setExercises,
      setExerciseIndex,
      setCorrectCount,
      setAttemptedCount,
      setLoadError,
    });
    return () => {
      active = false;
    };
    // savedLocalIndex intentionally excluded: it is captured once at mount and must not
    // trigger a reload when Redux writes the progress back during the lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, blockIndex, dispatch, experienceLevel]);

  useEffect(() => {
    if (loading || exercises.length === 0) return;
    dispatch(setSavedExerciseIndex(exerciseIndex));
    dispatch(saveBlockProgress({ level: experienceLevel, blockIndex, exerciseIndex }));
  }, [blockIndex, dispatch, exerciseIndex, experienceLevel, exercises.length, loading]);

  useLessonPracticeTime(accessToken, isFocused && !loading && Boolean(exercises[exerciseIndex]), exerciseIndex);

  return {
    exercises,
    loading,
    loadError,
    exerciseIndex,
    setExerciseIndex,
    correctCount,
    setCorrectCount,
    attemptedCount,
    setAttemptedCount,
  };
}
