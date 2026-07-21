import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeScreen } from "@/hooks/useHomeScreen";
import { useAppSelector } from "@/redux/hooks";
import type { HomeMainScreenProps } from "@/types/homeNavigation.types";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TypewriterText } from "@/components/common/TypewriterText/TypewriterText";
import { colors } from "@/theme/theme";
import { HomeHeroAction } from "./HomeHeroAction";
import { HomeTodayPanel } from "./HomeTodayPanel";
import { styles } from "./HomeScreen.styles";

export function HomeScreen({ navigation }: HomeMainScreenProps) {
  const home = useHomeScreen();
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const onDuelPress = () =>
    guardDuelAccess(
      isGuest,
      () => navigation.getParent()?.getParent()?.navigate("Auth" as never),
      () => navigation.navigate("DuelTab"),
    );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <EntranceRise slot={0}>
          <Text style={styles.date}>{`// ${new Date().toDateString()}`}</Text>
        </EntranceRise>
        <TypewriterText
          text={`Good morning, ${home.username}`}
          style={styles.greeting}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        />
        <EntranceRise slot={2}>
          <HomeTodayPanel home={home} />
        </EntranceRise>
        <EntranceRise slot={3}>
          <HomeHeroAction onPress={() => navigation.navigate("LearnTab")} />
        </EntranceRise>
        <EntranceRise slot={4} style={styles.tileRow}>
          <PressableScale style={styles.tile} haptic="light" onPress={() => navigation.navigate("CodePuzzle")}>
            <AppIcon name="puzzle" color={colors.accent} size={24} />
            <Text style={styles.tileTitle}>Code Puzzle</Text>
            <Text style={styles.tileSub}>bonus XP</Text>
          </PressableScale>
          <PressableScale style={[styles.tile, styles.tileDuel]} haptic="light" onPress={onDuelPress}>
            <AppIcon name="sword-cross" color={colors.duel} size={24} />
            <Text style={styles.tileTitle}>Duel Mode</Text>
            <Text style={styles.tileSub}>1v1 · live</Text>
          </PressableScale>
        </EntranceRise>
      </ScrollView>
    </SafeAreaView>
  );
}
