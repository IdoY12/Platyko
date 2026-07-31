import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { LearnStackParamList } from "@/types/learnNavigation.types";
import { LearnRoadmapScreen } from "@/components/learn/LearnRoadmapScreen/LearnRoadmapScreen";
import { LessonResultsScreen } from "@/components/learn/LessonResultsScreen/LessonResultsScreen";
import { LessonScreen } from "@/components/learn/LessonScreen/LessonScreen";
import { learnNavigatorStyles } from "./LearnNavigator.styles";

const Stack = createNativeStackNavigator<LearnStackParamList>();

/** Screens render their own TerminalHeader — stock navigation headers are disabled. */
export function LearnNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: learnNavigatorStyles.scene }}>
      <Stack.Screen name="LearnRoadmap" component={LearnRoadmapScreen} />
      <Stack.Screen name="Lesson" component={LessonScreen} />
      <Stack.Screen name="LessonResults" component={LessonResultsScreen} />
    </Stack.Navigator>
  );
}
