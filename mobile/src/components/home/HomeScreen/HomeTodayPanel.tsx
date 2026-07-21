import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { ProgressHairline } from "@/components/common/ProgressHairline/ProgressHairline";
import type { useHomeScreen } from "@/hooks/useHomeScreen";
import { colors } from "@/theme/theme";
import { styles } from "./HomeScreen.styles";

type Props = { home: ReturnType<typeof useHomeScreen> };

/** "Today" status panel: practice minutes + streak side by side, level progress as footer line. */
export function HomeTodayPanel({ home }: Props) {
  return (
    <View style={styles.todayPanel}>
      <View style={styles.statRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>
            {home.practiceMinutesToday}
            <Text style={styles.statUnit}> /{home.dailyGoalMinutes} min</Text>
          </Text>
          <Text style={styles.statLabel}>practice today</Text>
          <ProgressHairline pct={home.dailyGoalProgressPct} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <View style={styles.streakRow}>
            <AppIcon name="fire" color={colors.accent} />
            <Text style={styles.statValue}>{home.streak}</Text>
          </View>
          <Text style={styles.statLabel}>day streak</Text>
          {home.streakShowsDots && (
            <View style={styles.dotRow}>
              {home.streakDotsFilled.map((isFilled, idx) => (
                <View key={idx} style={[styles.dot, isFilled && styles.dotDone]} />
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.levelRow}>
        <Text style={styles.levelChip}>LVL {home.level}</Text>
        <ProgressHairline pct={home.currentLevelProgress} style={styles.levelBar} />
        <Text style={styles.levelXp}>
          {home.xp} / {home.nextLevelXp} XP
        </Text>
      </View>
    </View>
  );
}
