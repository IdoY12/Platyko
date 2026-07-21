import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { CountUpText } from "@/components/common/CountUpText/CountUpText";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { ProgressHairline } from "@/components/common/ProgressHairline/ProgressHairline";
import type { useHomeScreen } from "@/hooks/useHomeScreen";
import { colors } from "@/theme/theme";
import { styles } from "./HomeScreen.styles";

type Props = { home: ReturnType<typeof useHomeScreen> };

/** Beats (ms) inside the screen's entrance choreography, after the panel itself lands. */
const COUNT_DELAY_MS = 250;
const BAR_DELAY_MS = 320;

/** "Today" status panel: practice minutes + streak side by side, level progress as footer line. */
export function HomeTodayPanel({ home }: Props) {
  return (
    <View style={styles.todayPanel}>
      <View style={styles.statRow}>
        <View style={styles.statCell}>
          <View style={styles.statValueRow}>
            <CountUpText value={home.practiceMinutesToday} delayMs={COUNT_DELAY_MS} style={styles.statValue} />
            <Text style={styles.statUnit}> /{home.dailyGoalMinutes} min</Text>
          </View>
          <Text style={styles.statLabel}>practice today</Text>
          <ProgressHairline pct={home.dailyGoalProgressPct} delayMs={BAR_DELAY_MS} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <View style={styles.streakRow}>
            <AppIcon name="fire" color={colors.accent} />
            <CountUpText value={home.streak} delayMs={COUNT_DELAY_MS} style={styles.statValue} />
          </View>
          <Text style={styles.statLabel}>day streak</Text>
          {home.streakShowsDots && (
            <View style={styles.dotRow}>
              {home.streakDotsFilled.map((isFilled, idx) => (
                <EntranceRise key={idx} slot={5 + idx}>
                  <View style={[styles.dot, isFilled && styles.dotDone]} />
                </EntranceRise>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.levelRow}>
        <Text style={styles.levelChip}>LVL {home.level}</Text>
        <ProgressHairline pct={home.currentLevelProgress} delayMs={BAR_DELAY_MS} style={styles.levelBar} />
        <View style={styles.statValueRow}>
          <CountUpText value={home.xp} delayMs={COUNT_DELAY_MS} style={styles.levelXp} />
          <Text style={styles.levelXp}> / {home.nextLevelXp} XP</Text>
        </View>
      </View>
    </View>
  );
}
