import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/theme";
import type { LessonScreenProps } from "@/types/learnNavigation.types";
import { useLessonLoad } from "@/hooks/useLessonLoad";
import { useAppSelector } from "@/redux/hooks";
import type { LessonExerciseCompletionContext } from "@/types/lessonExerciseCompletion.types";
import { useLessonExerciseCompleteHandler } from "@/hooks/useLessonExerciseCompleteHandler";
import { LESSON_LOAD_FAILED_MESSAGE } from "@/constants/feedbackMessages";
import { CodeSnippet } from "@/components/common/CodeSnippet/CodeSnippet";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { ProgressHairline } from "@/components/common/ProgressHairline/ProgressHairline";
import { ExerciseView } from "@/components/learn/ExerciseView/ExerciseView";
import { lessonScreenStyles } from "./LessonScreen.styles";

export function LessonScreen({ navigation, route }: LessonScreenProps) {
  const experienceLevel = route.params.experienceLevel;
  const lessonTitle = route.params.lessonTitle;
  const blockIndex = route.params.blockIndex;
  const accessToken = useAppSelector((s) => s.session.accessToken);
  const load = useLessonLoad(experienceLevel, accessToken, blockIndex);
  const exercise = load.exercises[load.exerciseIndex];
  const onLessonExerciseComplete = useLessonExerciseCompleteHandler(navigation, experienceLevel, lessonTitle, blockIndex, load);
  const progress = load.exercises.length > 0 ? ((load.exerciseIndex + 1) / load.exercises.length) * 100 : 0;

  if (load.loading) {
    return (
      <SafeAreaView style={lessonScreenStyles.container} edges={["top", "bottom"]}>
        <MatrixRain opacity={0.25} />
        <View style={lessonScreenStyles.content}>
          <Text style={lessonScreenStyles.title}>Loading lesson...</Text>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={lessonScreenStyles.container} edges={["top", "bottom"]}>
        <View style={lessonScreenStyles.content}>
          <Text style={lessonScreenStyles.title}>
            {load.loadError ? LESSON_LOAD_FAILED_MESSAGE : "No exercises for this level yet."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const complete = (answer: string, context: LessonExerciseCompletionContext) =>
    void onLessonExerciseComplete(answer, context);

  return (
    <SafeAreaView style={lessonScreenStyles.container} edges={["top", "bottom"]}>
      <ScrollView style={lessonScreenStyles.container} contentContainerStyle={lessonScreenStyles.content}>
        <Text style={lessonScreenStyles.chapterDesc}>{`// ${lessonTitle}`}</Text>
        <ProgressHairline pct={progress} />
        <Text style={lessonScreenStyles.progressText}>
          {load.exerciseIndex + 1}/{load.exercises.length}
        </Text>
        <Text style={lessonScreenStyles.prompt}>{exercise.prompt}</Text>
        <CodeSnippet code={exercise.codeSnippet} />
        <ExerciseView exercise={exercise} accessToken={accessToken} onLessonExerciseComplete={complete} />
      </ScrollView>
    </SafeAreaView>
  );
}
