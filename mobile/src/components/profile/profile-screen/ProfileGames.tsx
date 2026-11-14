import { StyleSheet, View } from "react-native";
import type { GameRecordResponse } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { Surface } from "@/components/common/Surface/Surface";
import { getActiveLanguage, t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";

function Count({ value, label, colour }: { value: number; label: string; colour: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="number" align="center" color={colour}>
        {value}
      </AppText>
      <AppText variant="label" align="center" color={palette.text.secondary}>
        {label}
      </AppText>
    </View>
  );
}

/** Games on the profile (PRD 14.1): wins, losses and draws, then the last games with their opponents. */
export function ProfileGames({ record }: { record: GameRecordResponse }) {
  const dateFormat = new Intl.DateTimeFormat(getActiveLanguage(), { day: "numeric", month: "short" });
  return (
    <Surface style={styles.card}>
      <AppText variant="cardTitle" accessibilityRole="header">
        {t("profile.games")}
      </AppText>
      <View style={styles.counts}>
        <Count value={record.wins} label={t("profile.wins")} colour={palette.state.success} />
        <Count value={record.losses} label={t("profile.losses")} colour={palette.state.danger} />
        <Count value={record.draws} label={t("profile.draws")} colour={palette.brand.glow} />
      </View>
      {record.recent.length === 0 ? <AppText color={palette.text.secondary}>{t("profile.noGames")}</AppText> : null}
      {record.recent.map((game) => (
        <View key={game.matchId} style={styles.game}>
          <View style={styles.gameHeader}>
            <AppText variant="bodyStrong">{t(`play.mode.${game.mode}`)}</AppText>
            <AppText variant="label" color={palette.text.muted}>
              {dateFormat.format(new Date(game.endedAt))}
            </AppText>
          </View>
          <AppText variant="label" color={palette.text.secondary}>
            {t("profile.gameLine", { place: game.place, players: game.players, points: game.points })}
          </AppText>
          {game.opponents.length > 0 ? (
            <AppText variant="label" color={palette.text.muted} numberOfLines={1}>
              {t("profile.versus", { names: game.opponents.map((name) => name ?? t("play.deletedUser")).join(", ") })}
            </AppText>
          ) : null}
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  counts: { flexDirection: "row" },
  count: { flex: 1, gap: space.xs },
  game: { gap: 2, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: palette.line.subtle },
  gameHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
