import { useContext, useEffect, useState } from "react";
import { AppState, View, useWindowDimensions } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { useReducedMotion } from "react-native-reanimated";
import { motion } from "@/theme/theme";
import { MatrixRainColumn } from "./MatrixRainColumn";
import { styles } from "./MatrixRain.styles";

type Props = {
  /** Layer opacity — must stay clearly visible at arm's length; go ≥ 0.4 for feature zones. */
  opacity?: number;
  /** 0–1 fraction of the width-derived column budget (hard max 20 columns). */
  intensity?: number;
  /** Glyph color — JS-yellow by default; pass colors.duel for the arena. */
  color?: string;
};

/**
 * Falling 0/1 glyph rain, fully UI-thread driven (one Reanimated loop per column).
 * Unmounts every loop when the app is backgrounded or the hosting screen loses
 * navigation focus, so no off-screen animation ever runs. Works outside a
 * navigator too (no NavigationContext → always treated as focused).
 * Reduced motion: renders the glyph columns statically, no animation.
 */
export function MatrixRain({ opacity = 0.4, intensity = 1, color }: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const navigation = useContext(NavigationContext);
  const [screenFocused, setScreenFocused] = useState(() => navigation?.isFocused() ?? true);
  const [appActive, setAppActive] = useState(() => AppState.currentState === "active");

  useEffect(() => {
    if (!navigation) return;
    const offFocus = navigation.addListener("focus", () => setScreenFocused(true));
    const offBlur = navigation.addListener("blur", () => setScreenFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => subscription.remove();
  }, []);

  if (!reduceMotion && !(appActive && screenFocused)) return null;

  const columnBudget = Math.min(motion.rain.columnMax, Math.floor(width / motion.rain.columnWidth));
  const columnCount = Math.max(1, Math.round(columnBudget * Math.min(1, Math.max(0, intensity))));

  return (
    <View pointerEvents="none" style={[styles.layer, { opacity }]}>
      {Array.from({ length: columnCount }, (_, index) => (
        <MatrixRainColumn
          key={index}
          x={(index + 0.25) * (width / columnCount)}
          height={height}
          animate={!reduceMotion}
          color={color}
        />
      ))}
    </View>
  );
}
