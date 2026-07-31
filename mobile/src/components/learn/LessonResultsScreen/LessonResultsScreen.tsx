import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/redux/hooks";
import { logNav } from "@/utils/logger";
import type { LessonResultsNavigation } from "@/types/learnNavigation.types";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { GlyphScrambleText } from "@/components/common/GlyphScrambleText/GlyphScrambleText";
import { MatrixBurst } from "@/components/common/MatrixBurst/MatrixBurst";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
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
      <TerminalHeader title="~/learn/results $" onBack={() => navigation.goBack()} />
      <View style={lessonResultsStyles.content}>
        <GlyphScrambleText text="Lesson Complete" style={lessonResultsStyles.title} />
        <EntranceRise slot={1}>
          <TerminalFrame label="results">
            <Text style={lessonResultsStyles.resultText}>{lessonTitle}</Text>
            <Text style={lessonResultsStyles.resultText}>Accuracy: {accuracy}%</Text>
            <Text style={lessonResultsStyles.resultText}>Level: {level}</Text>
            <Text style={lessonResultsStyles.resultText}>Total XP: {xp}</Text>
          </TerminalFrame>
        </EntranceRise>
        <EntranceRise slot={2} style={lessonResultsStyles.starRow}>
          {Array.from({ length: stars }, (_, i) => (
            <AppIcon key={i} name="star" size={28} color={colors.accent} />
          ))}
        </EntranceRise>
        <EntranceRise slot={3}>
          <PressableScale
            style={lessonResultsStyles.lessonButton}
            haptic="medium"
            onPress={() => navigation.navigate("LearnRoadmap")}
          >
            <Text style={lessonResultsStyles.lessonButtonLabel}>Continue</Text>
          </PressableScale>
        </EntranceRise>
        <MatrixBurst />
      </View>
    </SafeAreaView>
  );
}
