import { StyleSheet, View } from "react-native";
import type { PlaySeat, Standing } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { StandingRow } from "@/components/common/StandingRow/StandingRow";
import { t } from "@/i18n/translate";
import { palette, space } from "@/theme/tokens";

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
          <StandingRow
            key={standing.userId}
            place={standing.place}
            name={name}
            avatarUrl={seat?.avatarUrl ?? null}
            value={standing.points}
            accessibilityLabel={`${t("play.place", { place: standing.place })}, ${name}, ${t("play.score", { points: standing.points })}`}
            isSelf={standing.userId === selfId}
            dimmed={standing.left}
            note={standing.left ? t("play.left") : undefined}
            extra={
              gained > 0 ? (
                <AppText variant="label" color={palette.state.success}>
                  {t("play.points", { points: gained })}
                </AppText>
              ) : null
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
});
