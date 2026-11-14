import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ACHIEVEMENTS } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { BadgeEmblem } from "../achievements/BadgeEmblem";
import { useEarnedAchievements } from "../achievements/useEarnedAchievements";

const SHOWN = 5;

/** The Profile's badge row: the latest badges first, then silhouettes, and the way to all of them. */
export function ProfileAchievements() {
  const navigation = useNavigation<RootNavigation>();
  const earned = useEarnedAchievements();
  const shown = [...ACHIEVEMENTS].sort((left, right) => Number(earned.has(right.code)) - Number(earned.has(left.code))).slice(0, SHOWN);
  const count = t("profile.achievementsCount", { earned: earned.size, total: ACHIEVEMENTS.length });
  return (
    <PressableScale onPress={() => navigation.navigate("Achievements")} accessibilityRole="button" accessibilityLabel={`${t("profile.achievements")}: ${count}`}>
      <Surface style={styles.card}>
        <View style={styles.header}>
          <AppText variant="label" color={palette.text.secondary}>
            {t("profile.achievements")}
          </AppText>
          <AppText variant="label" color={palette.text.muted}>
            {count}
          </AppText>
        </View>
        <View style={styles.row}>
          {shown.map((achievement) => (
            <BadgeEmblem key={achievement.code} icon={achievement.icon} earned={earned.has(achievement.code)} size={40} />
          ))}
        </View>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  header: { flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.sm, paddingVertical: space.sm },
});
