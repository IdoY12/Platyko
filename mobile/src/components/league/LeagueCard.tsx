import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import { palette, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { useLeague } from "./useLeague";

/** Home's league line (PRD 14.5): this week's place, or how to join. Hidden for guests and for anyone who left the league. */
export function LeagueCard() {
  const navigation = useNavigation<RootNavigation>();
  const { league } = useLeague();
  const userId = useAppSelector((state) => state.session.userId);
  if (!league || league.status === "left") return null;
  const summary =
    league.status === "active"
      ? `${t("league.rank", { rank: league.ownRank, count: league.standings.length })} · ${t("league.weeklyXp", { xp: league.standings.find((standing) => standing.id === userId)?.weeklyXp ?? 0 })}`
      : t("league.waitingShort");

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${t("league.title")}. ${summary}`} onPress={() => navigation.navigate("League")}>
      <Surface style={styles.card}>
        <MaterialCommunityIcons name="trophy-outline" size={28} color={palette.brand.js} />
        <View style={styles.text}>
          <AppText variant="cardTitle">{t("league.title")}</AppText>
          <AppText color={palette.text.secondary}>{summary}</AppText>
        </View>
      </Surface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.md },
  text: { flex: 1, gap: space.xs },
});
