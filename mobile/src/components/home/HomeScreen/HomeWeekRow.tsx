import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { Surface } from "@/components/common/Surface/Surface";
import { getActiveLanguage, t } from "@/i18n/translate";
import { glowShadow, palette, radii, space } from "@/theme/tokens";
import { weekDates } from "./homeMascotState";

type Props = { practisedDates: ReadonlySet<string>; today: string; goalDays: number };

/** The weekly goal (PRD 6.8): one dot per day this week, filled on days with practice. */
export function HomeWeekRow({ practisedDates, today, goalDays }: Props) {
  const dates = weekDates(today);
  const done = dates.filter((date) => practisedDates.has(date)).length;
  const dayFormat = new Intl.DateTimeFormat(getActiveLanguage(), { weekday: "narrow", timeZone: "UTC" });
  return (
    <Surface style={styles.card} accessible accessibilityLabel={`${t("home.weekTitle")}: ${t("home.weekProgress", { done, goal: goalDays })}`}>
      <View style={styles.titleRow}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("home.weekTitle")}
        </AppText>
        <AppText variant="label" color={done >= goalDays ? palette.state.success : palette.text.secondary}>
          {done >= goalDays ? t("home.weekGoalMet") : t("home.weekProgress", { done, goal: goalDays })}
        </AppText>
      </View>
      <View style={styles.days}>
        {dates.map((date) => {
          const practised = practisedDates.has(date);
          const isToday = date === today;
          return (
            <View key={date} style={styles.day}>
              <View style={[styles.dot, practised && styles.dotDone, practised && glowShadow(palette.brand.primary), isToday && !practised && styles.dotToday]} />
              <AppText variant="label" color={isToday ? palette.text.primary : palette.text.muted}>
                {dayFormat.format(new Date(`${date}T12:00:00Z`))}
              </AppText>
            </View>
          );
        })}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.lg },
  titleRow: { flexDirection: "row", justifyContent: "space-between" },
  days: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: space.xs },
  dot: { width: 26, height: 26, borderRadius: radii.pill, backgroundColor: palette.bg.raised, borderWidth: 2, borderColor: palette.line.subtle },
  dotDone: { backgroundColor: palette.brand.primary, borderColor: palette.brand.primary },
  dotToday: { borderColor: palette.brand.primary },
});
