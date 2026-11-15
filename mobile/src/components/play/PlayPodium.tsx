import { StyleSheet, View } from "react-native";
import type { PlaySeat, Standing } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { t } from "@/i18n/translate";
import { palette, radii, space, wash } from "@/theme/tokens";

/** Step heights by place: the winner stands highest. */
const STEP_HEIGHT: Record<number, number> = { 1: 96, 2: 64, 3: 40 };
const STEP_COLOUR: Record<number, string> = { 1: wash.js, 2: wash.glow, 3: wash.primary };

/**
 * The top three of a game (PRD 11.7) on steps, second and third beside the winner. Shared places
 * share a step height; the full table follows on the results screen.
 */
export function PlayPodium({ standings, seats }: { standings: Standing[]; seats: PlaySeat[] }) {
  const top = standings.filter((standing) => standing.place <= 3).slice(0, 3);
  const [first, second, third] = top;
  const order = [second, first, third].filter((standing): standing is Standing => Boolean(standing));
  return (
    <View style={styles.podium} accessible accessibilityLabel={top.map((standing) => `${t("play.place", { place: standing.place })}: ${seats.find((seat) => seat.userId === standing.userId)?.username ?? ""}`).join(", ")}>
      {order.map((standing) => {
        const seat = seats.find((candidate) => candidate.userId === standing.userId);
        return (
          <View key={standing.userId} style={styles.column}>
            <ProfileAvatar name={seat?.username ?? ""} avatarUrl={seat?.avatarUrl ?? null} size={standing.place === 1 ? 64 : 48} />
            <AppText variant="label" align="center" numberOfLines={1}>
              {seat?.username ?? ""}
            </AppText>
            <View style={[styles.step, { height: STEP_HEIGHT[standing.place], backgroundColor: STEP_COLOUR[standing.place] }]}>
              <AppText variant="number" color={standing.place === 1 ? palette.brand.js : palette.text.primary}>
                {standing.place}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: space.md },
  column: { flex: 1, maxWidth: 112, alignItems: "center", gap: space.sm },
  step: { alignSelf: "stretch", alignItems: "center", paddingTop: space.sm, borderTopLeftRadius: radii.button, borderTopRightRadius: radii.button },
});
