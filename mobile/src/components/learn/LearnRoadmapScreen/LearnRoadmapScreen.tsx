import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLearnRoadmapData } from "@/hooks/useLearnRoadmapData";
import type { LearnRoadmapNavigation } from "@/types/learnNavigation.types";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { learnRoadmapStyles as s } from "./LearnRoadmapScreen.styles";

type Props = { navigation: LearnRoadmapNavigation };

/** Curriculum as a vertical circuit: block nodes joined by a glowing path line. */
export function LearnRoadmapScreen({ navigation }: Props) {
  const { activeExperience, blocks } = useLearnRoadmapData();

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <TerminalHeader title="~/learn $" />
      <FlatList
        style={s.list}
        contentContainerStyle={s.content}
        data={blocks}
        keyExtractor={(item) => String(item.blockIndex)}
        ListHeaderComponent={
          <EntranceRise slot={0}>
            <Text style={s.title}>{activeExperience.charAt(0) + activeExperience.slice(1).toLowerCase()} track</Text>
            <Text style={s.subtitle}>3 blocks · 10 exercises each. Change your level in Profile.</Text>
          </EntranceRise>
        }
        ListFooterComponent={
          <View style={s.footerZone}>
            <MatrixRain opacity={0.25} intensity={0.5} />
            <Text style={s.footerLabel}>{"// end of track"}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <EntranceRise slot={index + 1}>
            {index > 0 ? <View style={s.connector} /> : null}
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
