import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { REACTIONS, type Reaction } from "@project/api-contract";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { playService } from "@/services/playSocket";
import { MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Icons, not emoji: they draw the same on every device and match the app's other icons. */
const REACTION_ICON: Record<Reaction, IconName> = { wave: "hand-wave", nice: "thumb-up", wow: "emoticon-excited", think: "head-question", oops: "emoticon-confused", gg: "handshake" };

/** A reaction shows beside its sender this long. */
const REACTION_SHOWN_MS = 3000;

/** A player's reaction while it is still fresh, drawn small beside their name; nothing otherwise. */
export function RecentReaction({ reactions, userId, now }: { reactions: Record<string, { reaction: Reaction; at: number }>; userId: string; now: number }) {
  const latest = reactions[userId];
  if (!latest || now - latest.at >= REACTION_SHOWN_MS) return null;
  return <MaterialCommunityIcons name={REACTION_ICON[latest.reaction]} size={20} color={palette.brand.js} accessibilityLabel={t(`play.reaction.${latest.reaction}`)} />;
}

/** The six preset reactions, the only way to talk in a game (PRD 11.2). */
export function ReactionBar() {
  return (
    <View style={styles.bar} accessibilityRole="toolbar" accessibilityLabel={t("play.react")}>
      {REACTIONS.map((reaction) => (
        <PressableScale key={reaction} accessibilityRole="button" accessibilityLabel={t(`play.reaction.${reaction}`)} onPress={() => playService.react(reaction)} style={styles.button}>
          <MaterialCommunityIcons name={REACTION_ICON[reaction]} size={24} color={palette.brand.js} />
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", gap: space.xs },
  button: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: palette.bg.surface },
});
