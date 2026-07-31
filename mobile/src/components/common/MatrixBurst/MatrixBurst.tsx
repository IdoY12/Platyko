import { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { colors } from "@/theme/theme";
import { MatrixBurstGlyph } from "./MatrixBurstGlyph";
import { styles } from "./MatrixBurst.styles";

type Props = {
  /** Glyph color — accent green by default; pass colors.duel for duel wins. */
  color?: string;
  count?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * One-shot celebration: 0/1 glyphs burst radially from the center and fade out.
 * Plays once on mount — render it keyed by the event (e.g. key={xp}) so each
 * new event replays it. Purely decorative: renders nothing under reduced motion.
 */
export function MatrixBurst({ color = colors.accent, count = 14, style }: Props) {
  const reduceMotion = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        angle: (index / count) * Math.PI * 2 + Math.random() * 0.5,
        distance: 40 + Math.random() * 50,
        delayMs: Math.random() * 120,
        glyph: Math.random() < 0.5 ? "0" : "1",
      })),
    [count],
  );

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={[styles.center, style]}>
      {particles.map((particle, index) => (
        <MatrixBurstGlyph key={index} {...particle} color={color} />
      ))}
    </View>
  );
}
