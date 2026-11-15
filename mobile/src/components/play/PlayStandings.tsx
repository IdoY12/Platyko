import { StyleSheet, View } from "react-native";
import type { PlaySeat, Standing } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { t } from "@/i18n/translate";
import { palette, radii, space, wash } from "@/theme/tokens";

type Props = { standings: Standing[]; seats: PlaySeat[]; selfId: string | null; roundPoints?: Record<string, number> };

/** Everyone in place order with their points; the learner's own row is lit, a leaver is dimmed. */
export function PlayStandings({ standings, seats, selfId, roundPoints }: Props) {
  return (
    <View style={styles.list}>
      {standings.map((standing) => {
        const seat = seats.find((candidate) => candidate.userId === standing.userId);
        const name = seat?.username ?? "";
        const gained = roundPoints?.[standing.userId] ?? 0;
        return (
          <View key={standing.userId} style={[styles.row, standing.userId === selfId && styles.self, standing.left && styles.left]} accessible accessibilityLabel={`${t("play.place", { place: standing.place })}, ${name}, ${t("play.score", { points: standing.points })}`}>
            <AppText variant="number" color={palette.text.muted} style={styles.place}>
              {standing.place}
            </AppText>
            <ProfileAvatar name={name} avatarUrl={seat?.avatarUrl ?? null} size={32} />
            <View style={styles.name}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {name}
              </AppText>
              {standing.left ? (
                <AppText variant="label" color={palette.text.muted}>
                  {t("play.left")}
                </AppText>
              ) : null}
            </View>
            {gained > 0 ? (
              <AppText variant="label" color={palette.state.success}>
                {t("play.points", { points: gained })}
              </AppText>
            ) : null}
            <AppText variant="number" color={palette.brand.js}>
              {standing.points}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radii.button, backgroundColor: palette.bg.surface },
  self: { backgroundColor: wash.primary },
  left: { opacity: 0.5 },
  place: { width: 20, textAlign: "center" },
  name: { flex: 1 },
});
