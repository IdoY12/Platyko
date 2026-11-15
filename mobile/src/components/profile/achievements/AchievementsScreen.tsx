import { StyleSheet, View } from "react-native";
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS } from "@project/learning-logic";
import type { MessageKey } from "@project/locales";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { shareCard } from "@/components/share/shareCard";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";
import { BadgeEmblem } from "./BadgeEmblem";
import { useEarnedAchievements } from "./useEarnedAchievements";

/** Every badge by group: earned ones in colour with a share button (PRD 14.4), the rest as silhouettes with how to earn them (PRD 14.2). */
export function AchievementsScreen() {
  const earned = useEarnedAchievements();
  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("achievements.title")} />
      <AppText color={palette.text.secondary}>{t("profile.achievementsCount", { earned: earned.size, total: ACHIEVEMENTS.length })}</AppText>
      {ACHIEVEMENT_GROUPS.map((group) => (
        <View key={group} style={styles.group}>
          <AppText variant="label" color={palette.brand.glow}>
            {t(`achievements.group.${group}`)}
          </AppText>
          {ACHIEVEMENTS.filter((achievement) => achievement.group === group).map((achievement) => {
            const isEarned = earned.has(achievement.code);
            const title = t(`achievements.${achievement.code}.title` as MessageKey);
            const rule = t(`achievements.${achievement.code}.rule` as MessageKey);
            return (
              <Surface key={achievement.code} style={styles.badge} accessible accessibilityLabel={`${title}. ${isEarned ? t("achievements.earned") : rule}`}>
                <BadgeEmblem icon={achievement.icon} earned={isEarned} size={44} />
                <View style={styles.text}>
                  <AppText variant="bodyStrong" color={isEarned ? palette.text.primary : palette.text.secondary}>
                    {title}
                  </AppText>
                  <AppText variant="label" color={isEarned ? palette.state.success : palette.text.muted}>
                    {isEarned ? t("achievements.earned") : rule}
                  </AppText>
                </View>
                {isEarned ? (
                  <PressableScale accessibilityRole="button" accessibilityLabel={`${t("summary.share")}: ${title}`} hitSlop={space.sm} onPress={() => void shareCard({ title, subtitle: rule }, t("achievements.share", { title }))}>
                    <MaterialCommunityIcons name="share-variant" size={22} color={palette.brand.primary} />
                  </PressableScale>
                ) : null}
              </Surface>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  group: { gap: space.md },
  badge: { flexDirection: "row", alignItems: "center", gap: space.lg },
  text: { flex: 1, gap: space.xs },
});
