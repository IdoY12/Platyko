import { useCallback, useEffect, useMemo, useState } from "react";
import type Exercise from "@/models/Exercise";
import type ExerciseSubmitResult from "@/models/ExerciseSubmitResult";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import LearningService from "@/services/auth-aware/LearningService";
import { runLessonExerciseCheck } from "@/hooks/useLessonExerciseInteractions";

export function usePickOneLessonExercise(
  exercise: Exercise,
  accessToken: string | null,
  onLessonExerciseComplete: (a: string, c: LessonExerciseCompletionContext) => void,
) {
  const learning = useAuthenticatedService(LearningService);
  const [selected, setSelected] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [serverResult, setServerResult] = useState<ExerciseSubmitResult | null>(null);
  const [lastCheckedAnswer, setLastCheckedAnswer] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setHasChecked(false);
    setIsAnswerCorrect(null);
    setServerResult(null);
    setLastCheckedAnswer(null);
    setSubmitError(null);
  }, [exercise.id]);

  const canCheck = Boolean(selected) && isAnswerCorrect !== true;

  const runCheck = useCallback(async () => {
    if (!selected) return;
    setLastCheckedAnswer(selected);
    await runLessonExerciseCheck(learning, accessToken, exercise, selected, {
      setServerResult,
      setIsAnswerCorrect,
      setHasChecked,
      setSubmitError,
    });
  }, [accessToken, exercise, learning, selected]);

  const goNext = useCallback(() => {
    if (!selected || !serverResult || isAnswerCorrect !== true) return;
    onLessonExerciseComplete(selected, { source: "curriculum", isAnswerCorrect: true, submitResult: serverResult });
  }, [isAnswerCorrect, onLessonExerciseComplete, selected, serverResult]);

  const options = useMemo(
    () => (exercise.options.length > 0 ? exercise.options.map((o) => o.text) : exercise.codeSnippet.split(" ")),
    [exercise],
  );

  return {
    selected,
    setSelected,
    hasChecked,
    isAnswerCorrect,
    serverResult,
    lastCheckedAnswer,
    submitError,
    canCheck,
    runCheck,
    goNext,
    options,
  };
}
