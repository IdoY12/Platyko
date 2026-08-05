import { Pressable, Text } from "react-native";
import type Exercise from "@/models/Exercise";
import { usePickOneLessonExercise } from "@/hooks/usePickOneLessonExercise";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { MatrixBurst } from "@/components/common/MatrixBurst/MatrixBurst";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { exerciseViewStyles } from "./ExerciseView.styles";

type ExerciseViewMCQProps = {
  exercise: Exercise;
  accessToken: string | null;
  onLessonExerciseComplete: (answer: string, context: LessonExerciseCompletionContext) => void;
  onExplanationRevealed: (explanation: string | null) => void;
};

/** List UI for curriculum `MCQ` exercises (typed answer selection). */
export function ExerciseViewMCQ({ exercise, accessToken, onLessonExerciseComplete, onExplanationRevealed }: ExerciseViewMCQProps) {
  const pickOne = usePickOneLessonExercise(exercise, accessToken, onLessonExerciseComplete, onExplanationRevealed);

  const styleForOptionAfterInteraction = (optionText: string) => {
    if (pickOne.lastCheckedAnswer === optionText && pickOne.isAnswerCorrect) return [exerciseViewStyles.option, exerciseViewStyles.correct];

    if (pickOne.lastCheckedAnswer === optionText && !pickOne.isAnswerCorrect && pickOne.hasChecked) return [exerciseViewStyles.option, exerciseViewStyles.wrong];
    if (pickOne.selected === optionText) return [exerciseViewStyles.option, exerciseViewStyles.optionSelected];

    return exerciseViewStyles.option;
  };

  const promptAsksForTokenTap = exercise.prompt.toLowerCase().includes("tap");
  const successHeadline = promptAsksForTokenTap ? "Token identified." : "Correct!";

  return (
    <TerminalFrame label="exercise.mcq">
      {promptAsksForTokenTap ? <Text style={exerciseViewStyles.hint}>Tap the correct token from this list.</Text> : null}
      {pickOne.options.map((optionText, optionIndex) => (
        <Pressable
          key={`${optionText}-${optionIndex}`}
          style={styleForOptionAfterInteraction(optionText)}
          onPress={() => pickOne.setSelected(optionText)}
          disabled={pickOne.isAnswerCorrect === true}
        >
          <Text style={exerciseViewStyles.optionLabel}>{optionText}</Text>
        </Pressable>
      ))}
      <PressableScale
        style={[exerciseViewStyles.lessonButton, !pickOne.canCheck && exerciseViewStyles.disabled]}
        disabled={!pickOne.canCheck}
        haptic="light"
        onPress={() => void pickOne.runCheck()}
      >
        <Text style={exerciseViewStyles.lessonButtonLabel}>Check</Text>
      </PressableScale>
      {pickOne.submitError ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>{pickOne.submitError}</Text>
      ) : null}
      {pickOne.hasChecked && pickOne.isAnswerCorrect ? (
        <>
          <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackGood]}>{successHeadline}</Text>
          <PressableScale style={exerciseViewStyles.lessonButton} haptic="medium" onPress={pickOne.goNext}>
            <Text style={exerciseViewStyles.lessonButtonLabel}>Next</Text>
          </PressableScale>
          <MatrixBurst />
        </>
      ) : pickOne.hasChecked ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>Try again.</Text>
      ) : null}
    </TerminalFrame>
  );
}
