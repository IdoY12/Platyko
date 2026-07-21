import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeScreen } from "@/hooks/useHomeScreen";
import { useAppSelector } from "@/redux/hooks";
import type { HomeMainScreenProps } from "@/types/homeNavigation.types";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { colors } from "@/theme/theme";
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
        <Text style={styles.date}>{`// ${new Date().toDateString()}`}</Text>
        <Text style={styles.greeting}>Good morning, {home.username}</Text>
        <HomeTodayPanel home={home} />
        <PressableScale style={styles.hero} haptic onPress={() => navigation.navigate("LearnTab")}>
          <View>
            <Text style={styles.heroTitle}>Continue Learning</Text>
            <Text style={styles.heroSub}>Pick up where you left off</Text>
          </View>
          <AppIcon name="arrow-right" color={colors.onAccent} size={24} />
        </PressableScale>
        <View style={styles.tileRow}>
          <PressableScale style={styles.tile} onPress={() => navigation.navigate("CodePuzzle")}>
            <AppIcon name="puzzle" color={colors.accent} size={24} />
            <Text style={styles.tileTitle}>Code Puzzle</Text>
            <Text style={styles.tileSub}>bonus XP</Text>
          </PressableScale>
          <PressableScale style={[styles.tile, styles.tileDuel]} onPress={onDuelPress}>
            <AppIcon name="sword-cross" color={colors.duel} size={24} />
            <Text style={styles.tileTitle}>Duel Mode</Text>
            <Text style={styles.tileSub}>1v1 · live</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
