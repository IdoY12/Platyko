import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, wash } from "@/theme/tokens";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** A badge's geometric emblem (PRD 14.2): the bill orange when earned, a quiet silhouette until then. */
export function BadgeEmblem({ icon, earned, size = 56 }: { icon: string; earned: boolean; size?: number }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 3 }, earned ? styles.earned : styles.locked]}>
      {/* The diamond is a turned square; the icon turns back so it stands upright. */}
      <MaterialCommunityIcons name={icon as IconName} size={size * 0.5} color={earned ? palette.brand.primary : palette.text.muted} style={styles.upright} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center", borderWidth: 2, transform: [{ rotate: "45deg" }] },
  earned: { borderColor: palette.brand.primary, backgroundColor: wash.primary },
  upright: { transform: [{ rotate: "-45deg" }] },
  locked: { borderColor: palette.line.strong, backgroundColor: palette.bg.surface, opacity: 0.6 },
});
