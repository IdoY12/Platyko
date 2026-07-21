import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
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
import { addStudySeconds } from "@/redux/session-slice";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import UserService from "@/services/auth-aware/UserService";
import { drainRefInt } from "@/utils/formatHelpers";
import { runLessonExerciseLoad } from "@/utils/runLessonExerciseLoad";
import { tryPostPracticeLog } from "@/utils/tryPostPracticeLog";

export function useLessonLoad(experienceLevel: Experience, accessToken: string | null, blockIndex: number) {
  const dispatch = useAppDispatch();
  const user = useAuthenticatedService(UserService);
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const trackedRef = useRef(0);

  const flushPractice = useCallback(async () => {
    if (!accessTokenRef.current || trackedRef.current <= 0 || !user) return;
    const seconds = drainRefInt(trackedRef);
    const ok = await tryPostPracticeLog(user, seconds);
    if (!ok) { trackedRef.current += seconds; }
  }, [user]);

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

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appStateRef.current === "active" && next !== "active") void flushPractice();
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [flushPractice]);

  useEffect(() => {
    if (!isFocused || loading || !exercises[exerciseIndex]) return;
    const t = setInterval(() => {
      if (appStateRef.current === "active") {
        trackedRef.current += 1;
        dispatch(addStudySeconds(1));
      }
    }, 1000);
    return () => {
      clearInterval(t);
      void flushPractice();
    };
  }, [dispatch, exerciseIndex, exercises, flushPractice, isFocused, loading]);

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
