import { Pressable, Text, View } from "react-native";
import type Exercise from "@/models/Exercise";
import { usePickOneLessonExercise } from "@/hooks/usePickOneLessonExercise";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { exerciseViewStyles } from "./ExerciseView.styles";

type ExerciseViewMCQProps = {
  exercise: Exercise;
  accessToken: string | null;
  onLessonExerciseComplete: (answer: string, context: LessonExerciseCompletionContext) => void;
};

/** List UI for curriculum `MCQ` exercises (typed answer selection). */
export function ExerciseViewMCQ({ exercise, accessToken, onLessonExerciseComplete }: ExerciseViewMCQProps) {
  const pickOne = usePickOneLessonExercise(exercise, accessToken, onLessonExerciseComplete);

  const styleForOptionAfterInteraction = (optionText: string) => {
    if (pickOne.lastCheckedAnswer === optionText && pickOne.isAnswerCorrect) return [exerciseViewStyles.option, exerciseViewStyles.correct];

    if (pickOne.lastCheckedAnswer === optionText && !pickOne.isAnswerCorrect && pickOne.hasChecked) return [exerciseViewStyles.option, exerciseViewStyles.wrong];
    if (pickOne.selected === optionText) return [exerciseViewStyles.option, exerciseViewStyles.optionSelected];

    return exerciseViewStyles.option;
  };

  const promptAsksForTokenTap = exercise.prompt.toLowerCase().includes("tap");
  const successHeadline = promptAsksForTokenTap ? "Token identified." : "Correct!";

  return (
    <View style={exerciseViewStyles.exerciseCard}>
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
      <Pressable
        style={[exerciseViewStyles.lessonButton, !pickOne.canCheck && exerciseViewStyles.disabled]}
        disabled={!pickOne.canCheck}
        onPress={() => void pickOne.runCheck()}
      >
        <Text style={exerciseViewStyles.lessonButtonLabel}>Check</Text>
      </Pressable>
      {pickOne.submitError ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>{pickOne.submitError}</Text>
      ) : null}
      {pickOne.hasChecked && pickOne.isAnswerCorrect ? (
        <>
          <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackGood]}>{successHeadline}</Text>
          {pickOne.serverResult?.explanation ? <Text style={exerciseViewStyles.feedback}>{pickOne.serverResult.explanation}</Text> : null}
          <Pressable style={exerciseViewStyles.lessonButton} onPress={pickOne.goNext}>
            <Text style={exerciseViewStyles.lessonButtonLabel}>Next</Text>
          </Pressable>
        </>
      ) : pickOne.hasChecked ? (
        <Text style={[exerciseViewStyles.feedback, exerciseViewStyles.feedbackBad]}>Try again.</Text>
      ) : null}
    </View>
  );
}
