import { StyleSheet, View } from "react-native";
import type { PracticeDay } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { LtrView } from "@/components/common/AppText/LtrView";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { palette, radii, space } from "@/theme/tokens";

const WEEKS = 12;
const DAYS_PER_WEEK = 7;

/** Fill for a day's practice: none, a little, a lesson, more. */
function cellColour(items: number): string {
  if (items === 0) return palette.bg.raised;
  if (items < 4) return "rgba(255,138,61,0.35)";
  if (items < 9) return "rgba(255,138,61,0.65)";
  return palette.brand.primary;
}

/** The last twelve weeks, a column per week and a cell per day, in the style developers know from GitHub (PRD 14.1). */
export function ActivityMap({ days, today }: { days: readonly PracticeDay[]; today: string }) {
  const itemsByDate = new Map(days.map((day) => [day.date, day.itemsAnswered]));
  const end = new Date(`${today}T12:00:00Z`);
  const totalDays = WEEKS * DAYS_PER_WEEK;
  const dates = Array.from({ length: totalDays }, (_unused, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (totalDays - 1 - index));
    return date.toISOString().slice(0, 10);
  });
  const practisedDays = dates.filter((date) => (itemsByDate.get(date) ?? 0) > 0).length;
  return (
    <Surface style={styles.card} accessible accessibilityLabel={`${t("profile.activityTitle")}: ${practisedDays}`}>
      <AppText variant="label" color={palette.text.secondary}>
        {t("profile.activityTitle")}
      </AppText>
      {/* Time runs left to right, like the grid developers know; it is a chart, so it is not mirrored. */}
      <LtrView style={styles.grid}>
        {Array.from({ length: WEEKS }, (_unused, week) => (
          <View key={week} style={styles.week}>
            {dates.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK).map((date) => (
              <View key={date} style={[styles.cell, { backgroundColor: cellColour(itemsByDate.get(date) ?? 0) }, date === today && styles.today]} />
            ))}
          </View>
        ))}
      </LtrView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  grid: { flexDirection: "row", justifyContent: "space-between" },
  week: { gap: 4 },
  cell: { width: 18, height: 18, borderRadius: radii.chip / 2 },
  today: { borderWidth: 2, borderColor: palette.brand.js },
});
