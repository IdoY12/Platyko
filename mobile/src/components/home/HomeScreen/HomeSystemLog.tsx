import { Text, View } from "react-native";
import { EntranceRise } from "@/components/common/EntranceRise/EntranceRise";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { TypewriterText } from "@/components/common/TypewriterText/TypewriterText";
import type { useHomeScreen } from "@/hooks/useHomeScreen";
import { styles } from "./HomeScreen.styles";

type Props = { home: ReturnType<typeof useHomeScreen> };

/** Ambient footer zone: rain strip + typed system-log readout of today's stats.
 *  Pure re-presentation of the data the screen already renders — no new sources. */
export function HomeSystemLog({ home }: Props) {
  const lines = [
    `> xp.total = ${home.xp}`,
    `> level.current = ${home.level} (${Math.round(home.currentLevelProgress)}% to L${home.level + 1})`,
    `> streak.days = ${home.streak}`,
    `> practice.today = ${home.practiceMinutesToday}/${home.dailyGoalMinutes} min`,
  ];
  return (
    <View style={styles.logZone}>
      <MatrixRain opacity={0.25} intensity={0.6} />
      <Text style={styles.logTitle}>{"// system.log"}</Text>
      {lines.map((line, index) => (
        <EntranceRise key={line} slot={6 + index}>
          <TypewriterText text={line} charDelayMs={12} style={styles.logLine} numberOfLines={1} />
        </EntranceRise>
      ))}
    </View>
  );
}
