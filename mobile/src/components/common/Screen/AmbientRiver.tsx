import { Canvas, Circle, LinearGradient, Path, RadialGradient, Rect, Skia, vec } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { palette } from "@/theme/tokens";

type Props = {
  /** The river only moves while its screen is in front. */
  active: boolean;
};

const DRIFT_PERIOD_MS = 26_000;
const MOTE_COUNT = 18;
const TWO_PI = Math.PI * 2;

/** A stable pseudo-random number in 0..1 for a mote, so motes keep their place between renders. */
function scatter(index: number, salt: number): number {
  "worklet";
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * The background of the app's open screens: deep navy water with two slow pools of light and a
 * few motes rising through it. It directs no attention and carries no meaning, so it stays
 * faint, and under Reduce Motion it does not move at all (the loop never starts).
 */
export function AmbientRiver({ active }: Props) {
  const { width, height } = useWindowDimensions();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    drift.set(withRepeat(withTiming(1, { duration: DRIFT_PERIOD_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(drift);
  }, [active, drift]);

  const cyanPool = useDerivedValue(() => vec(width * (0.82 + 0.08 * Math.sin(drift.get() * TWO_PI)), height * (0.16 + 0.04 * Math.cos(drift.get() * TWO_PI))));
  const indigoPool = useDerivedValue(() => vec(width * (0.12 - 0.06 * Math.sin(drift.get() * TWO_PI)), height * (0.74 + 0.05 * Math.cos(drift.get() * TWO_PI))));
  const motes = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (let index = 0; index < MOTE_COUNT; index += 1) {
      const rise = (scatter(index, 1) + drift.get() * (1 + Math.floor(scatter(index, 2) * 3))) % 1;
      const sway = Math.sin((drift.get() * 3 + scatter(index, 3)) * TWO_PI) * 10;
      path.addCircle(scatter(index, 4) * width + sway, height * (1.05 - rise * 1.1), 0.8 + scatter(index, 5) * 1.6);
    }
    return path;
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[palette.bg.base, palette.bg.deep]} />
      </Rect>
      <Circle c={cyanPool} r={width * 0.75}>
        <RadialGradient c={cyanPool} r={width * 0.75} colors={["rgba(33,230,245,0.11)", "rgba(33,230,245,0)"]} />
      </Circle>
      <Circle c={indigoPool} r={width * 0.9}>
        <RadialGradient c={indigoPool} r={width * 0.9} colors={["rgba(96,104,255,0.16)", "rgba(96,104,255,0)"]} />
      </Circle>
      <Path path={motes} color="rgba(182,184,222,0.32)" />
    </Canvas>
  );
}
