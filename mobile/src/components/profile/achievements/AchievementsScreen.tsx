import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS } from "@project/learning-logic";
import type { MessageKey } from "@project/locales";
import { AppText } from "@/components/common/AppText/AppText";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { useAppSelector } from "@/redux/hooks";
import { earnedAchievementCodes } from "@/redux/learning-selectors";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";
import { BadgeEmblem } from "./BadgeEmblem";

/** Every badge by group: earned ones in colour, the rest as silhouettes with how to earn them (PRD 14.2). */
export function AchievementsScreen() {
  const { map, progress } = useAppSelector((state) => state.learning);
  const earned = useMemo(() => earnedAchievementCodes(progress, map), [map, progress]);
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
