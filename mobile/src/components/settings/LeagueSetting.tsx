import { Alert, Switch } from "react-native";
import { useLeague } from "@/components/league/useLeague";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import LeagueService from "@/services/auth-aware/LeagueService";
import { palette } from "@/theme/tokens";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { SettingsRow } from "./SettingsRow";

/** Taking part in the weekly league (PRD 14.5); leaving also takes the learner out of this week's group. */
export function LeagueSetting() {
  const { league, reload } = useLeague();
  if (!league) return null;
  const toggle = async (enabled: boolean) => {
    try {
      await new LeagueService().setMembership(enabled, getStreakCalendarDate());
      reload();
    } catch (error) {
      Alert.alert(t("league.title"), localizedError(error));
    }
  };
  const enabled = league.status !== "left";
  return (
    <SettingsRow
      icon="trophy-outline"
      label={t("league.title")}
      detail={t("settings.leagueHint")}
      trailing={<Switch value={enabled} onValueChange={(next) => void toggle(next)} accessibilityLabel={t("league.title")} trackColor={{ true: palette.brand.primary }} />}
    />
  );
}
