import { FlatList, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLearnRoadmapData } from "@/hooks/useLearnRoadmapData";
import type { LearnRoadmapNavigation } from "@/types/learnNavigation.types";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { learnRoadmapStyles as s } from "./LearnRoadmapScreen.styles";

type Props = { navigation: LearnRoadmapNavigation };

export function LearnRoadmapScreen({ navigation }: Props) {
  const { activeExperience, blocks } = useLearnRoadmapData();

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <FlatList
        style={s.container}
        contentContainerStyle={s.content}
        data={blocks}
        keyExtractor={(item) => String(item.blockIndex)}
        ListHeaderComponent={
          <Text style={s.title}>
            {activeExperience.charAt(0) + activeExperience.slice(1).toLowerCase()} track{"\n"}
            <Text style={s.subtitle}>3 blocks · 10 exercises each. Change your level in Profile.</Text>
          </Text>
        }
        renderItem={({ item, index }) => (
          <EntranceRise slot={index}>
            <TerminalFrame label={`block.0${item.blockIndex + 1}`}>
              <Text style={s.chapterTitle}>{item.title}</Text>
              <Text style={s.chapterDesc}>{item.description}</Text>
              <PressableScale
                style={s.lessonButton}
                haptic="light"
                onPress={() =>
                  navigation.navigate("Lesson", {
                    experienceLevel: activeExperience,
                    lessonTitle: item.title,
                    blockIndex: item.blockIndex,
                  })
                }
              >
                <Text style={s.lessonButtonLabel}>Start</Text>
              </PressableScale>
            </TerminalFrame>
          </EntranceRise>
        )}
      />
    </SafeAreaView>
  );
}
