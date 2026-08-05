import { useCallback, useEffect, useState } from "react";
import type Exercise from "@/models/Exercise";
import type ExerciseSubmitResult from "@/models/ExerciseSubmitResult";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import LearningService from "@/services/auth-aware/LearningService";
import { runLessonExerciseCheck } from "@/hooks/useLessonExerciseInteractions";

export function useBuiltAnswerLessonExercise(
  exercise: Exercise,
  accessToken: string | null,
  onLessonExerciseComplete: (answer: string, completionContext: LessonExerciseCompletionContext) => void,
  onExplanationRevealed?: (explanation: string | null) => void,
) {
  const learning = useAuthenticatedService(LearningService);
  const [input, setInput] = useState("");
  const [serverResult, setServerResult] = useState<ExerciseSubmitResult | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setInput("");
    setServerResult(null);
    setHasChecked(false);
    setIsAnswerCorrect(null);
    setSubmitError(null);
  }, [exercise.id]);

  const canCheck = input.trim().length > 0 && isAnswerCorrect !== true;

  const runCheck = useCallback(async () => {
    const answer = input.trim();
    if (!answer) return;
    await runLessonExerciseCheck(learning, accessToken, exercise, answer, {
      setServerResult,
      setIsAnswerCorrect,
      setHasChecked,
      setSubmitError,
      onExplanationRevealed,
    });
  }, [accessToken, exercise, input, learning, onExplanationRevealed]);

  const goNext = useCallback(() => {
    const answer = input.trim();
    if (!serverResult || isAnswerCorrect !== true) return;
    onLessonExerciseComplete(answer, { source: "curriculum", isAnswerCorrect: true, submitResult: serverResult });
  }, [input, isAnswerCorrect, onLessonExerciseComplete, serverResult]);

  return { input, setInput, hasChecked, isAnswerCorrect, serverResult, submitError, canCheck, runCheck, goNext };
}
