import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeScreen } from "@/hooks/useHomeScreen";
import { useAppSelector } from "@/redux/hooks";
import type { HomeMainScreenProps } from "@/types/homeNavigation.types";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { colors } from "@/theme/theme";
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
        <View style={styles.titleRow}>
          <Text style={styles.greeting}>Good morning, {home.username}</Text>
          <AppIcon name="hand-wave" color={colors.accent} />
        </View>
        <Text style={styles.date}>{new Date().toDateString()}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Practice time today</Text>
          <Text style={styles.subText}>
            {home.practiceMinutesToday} / {home.dailyGoalMinutes} min
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${home.dailyGoalProgressPct}%` }]} />
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <AppIcon name="fire" color={colors.accent} />
            <Text style={styles.cardTitle}>{home.streak}-day streak!</Text>
          </View>
          <Text style={styles.subText}>
            Complete at least one exercise every day to keep your streak alive.
          </Text>
          {home.streakShowsDots && (
            <View style={styles.row}>
              {home.streakDotsFilled.map((isFilled, idx) => (
                <View key={idx} style={[styles.dot, isFilled && styles.dotDone]} />
              ))}
            </View>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Level {home.level} · {home.xp} / {home.nextLevelXp} XP
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${home.currentLevelProgress}%` }]} />
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.cardTitle}>Continue Learning</Text>
          <Text style={styles.subText}>Jump back into your roadmap and keep your streak alive.</Text>
          <Pressable style={styles.primary} onPress={() => navigation.navigate("LearnTab")}>
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <AppIcon name="puzzle" color={colors.accent} />
            <Text style={styles.cardTitle}>Code Puzzle</Text>
          </View>
          <Text style={styles.subText}>Solve expression puzzles and earn bonus XP.</Text>
          <Pressable style={styles.secondary} onPress={() => navigation.navigate("CodePuzzle")}>
            <Text style={styles.secondaryText}>Open Puzzle</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <AppIcon name="sword-cross" color={colors.duel} />
            <Text style={styles.cardTitle}>Duel Mode</Text>
          </View>
          <Text style={styles.subText}>Challenge players worldwide.</Text>
          <Pressable style={styles.secondary} onPress={onDuelPress}>
            <Text style={styles.secondaryText}>Find a Match</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
