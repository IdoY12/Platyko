import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeScreen } from "@/hooks/useHomeScreen";
import { useAppSelector } from "@/redux/hooks";
import type { HomeMainScreenProps } from "@/types/homeNavigation.types";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { TypewriterText } from "@/components/common/TypewriterText/TypewriterText";
import { colors } from "@/theme/theme";
import { HomeHeroAction } from "./HomeHeroAction";
import { HomeSystemLog } from "./HomeSystemLog";
import { HomeTodayPanel } from "./HomeTodayPanel";
import { styles } from "./HomeScreen.styles";

export function HomeScreen({ navigation }: HomeMainScreenProps) {
  const home = useHomeScreen();
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const onDuelPress = () =>
    guardDuelAccess(
      isGuest,
      () => navigation.navigate("Auth"),
      () => navigation.navigate("DuelTab"),
    );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.heroZone}>
          <MatrixRain opacity={0.45} intensity={0.9} />
          <EntranceRise slot={0}>
            <Text style={styles.date}>{`// ${new Date().toDateString()}`}</Text>
          </EntranceRise>
          <TypewriterText
            text={`> ${home.greeting}, ${home.username}`}
            style={styles.greeting}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          />
        </View>
        <View style={styles.body}>
          <EntranceRise slot={2}>
            <HomeTodayPanel home={home} />
          </EntranceRise>
          <EntranceRise slot={3}>
            <HomeHeroAction onPress={() => navigation.navigate("LearnTab")} />
          </EntranceRise>
          <EntranceRise slot={4} style={styles.tileRow}>
            <PressableScale style={styles.tile} haptic="light" onPress={() => navigation.navigate("CodePuzzle")}>
              <TerminalFrame style={styles.tileFrame}>
                <AppIcon name="puzzle" color={colors.accent} size={24} />
                <Text style={styles.tileTitle}>Code Puzzle</Text>
                <Text style={styles.tileSub}>bonus XP</Text>
              </TerminalFrame>
            </PressableScale>
            <PressableScale style={styles.tile} haptic="light" onPress={onDuelPress}>
              <TerminalFrame style={[styles.tileFrame, styles.tileDuel]} bracketColor={colors.duel}>
                <AppIcon name="sword-cross" color={colors.duel} size={24} />
                <Text style={styles.tileTitle}>Duel Mode</Text>
                <Text style={styles.tileSub}>1v1 · live</Text>
              </TerminalFrame>
            </PressableScale>
          </EntranceRise>
        </View>
        <EntranceRise slot={5} style={styles.logWrap}>
          <HomeSystemLog home={home} />
        </EntranceRise>
      </ScrollView>
    </SafeAreaView>
  );
}
