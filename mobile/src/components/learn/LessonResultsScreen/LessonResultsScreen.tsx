import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/redux/hooks";
import { logNav } from "@/utils/logger";
import type { LessonResultsNavigation } from "@/types/learnNavigation.types";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { colors } from "@/theme/theme";
import { lessonResultsStyles } from "./LessonResultsScreen.styles";

type RouteParams = { accuracy?: number; lessonTitle?: string; experienceLevel?: "JUNIOR" | "MID" | "SENIOR" };

type Props = {
  navigation: LessonResultsNavigation;
  route: { params?: RouteParams };
};

export function LessonResultsScreen({ navigation, route }: Props) {
  const accuracy = route.params?.accuracy ?? 0;
  const lessonTitle = route.params?.lessonTitle ?? "Lesson";
  const level = useAppSelector((s) => s.xp.level);
  const xp = useAppSelector((s) => s.xp.xpTotal);

  useEffect(() => {
    logNav("screen:enter", { screen: "LessonResultsScreen" });
    return () => logNav("screen:leave", { screen: "LessonResultsScreen" });
  }, []);

  const stars = accuracy > 90 ? 3 : accuracy > 70 ? 2 : 1;

  return (
    <SafeAreaView style={lessonResultsStyles.container} edges={["top", "bottom"]}>
      <View style={lessonResultsStyles.content}>
        <Text style={lessonResultsStyles.title}>Lesson Complete</Text>
        <Text style={lessonResultsStyles.resultText}>{lessonTitle}</Text>
        <Text style={lessonResultsStyles.resultText}>Accuracy: {accuracy}%</Text>
        <Text style={lessonResultsStyles.resultText}>Level: {level}</Text>
        <Text style={lessonResultsStyles.resultText}>Total XP: {xp}</Text>
        <View style={lessonResultsStyles.starRow}>
          {Array.from({ length: stars }, (_, i) => (
            <AppIcon key={i} name="star" size={28} color={colors.accent} />
          ))}
        </View>
        <Pressable style={lessonResultsStyles.lessonButton} onPress={() => navigation.navigate("LearnRoadmap")}>
          <Text style={lessonResultsStyles.lessonButtonLabel}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
