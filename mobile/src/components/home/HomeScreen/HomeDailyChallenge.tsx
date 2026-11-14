import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { DailyChallengeResult } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { DailyChallengeGrid } from "@/components/lesson/DailyChallengeGrid";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";

const HOURS_PER_DAY = 24;

/** The day's challenge on Home: how long it stays open and a way in, or today's result once played. */
export function HomeDailyChallenge({ todayResult, onPlay }: { todayResult: DailyChallengeResult | null; onPlay: () => void }) {
  const hoursLeft = HOURS_PER_DAY - new Date().getHours();
  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-star" size={24} color={palette.brand.js} />
        <AppText variant="cardTitle" style={styles.title}>
          {t("home.dailyTitle")}
        </AppText>
        {todayResult ? null : (
          <AppText variant="label" color={palette.text.muted}>
            {t("home.dailyEnds", { hours: hoursLeft })}
          </AppText>
        )}
      </View>
      {todayResult ? (
        <>
          <DailyChallengeGrid grid={todayResult.grid} />
          <AppText align="center" color={palette.text.secondary}>
            {t("home.dailyDone")}
          </AppText>
        </>
      ) : (
        <>
          <AppText color={palette.text.secondary}>{t("home.dailyBody")}</AppText>
          <OutlineButton label={t("home.dailyAction")} onPress={onPlay} />
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { flex: 1 },
});
