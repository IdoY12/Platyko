import { Group, LinearGradient, Oval, Path, Skia, vec } from "@shopify/react-native-skia";
import { useDerivedValue, type DerivedValue } from "react-native-reanimated";
import { palette, scene } from "@/theme/tokens";
import { ART_VIEW, BILL_VOLUME, LEFT_CHEEK, RIGHT_CHEEK } from "./mascotArt";
import type { MascotFrame } from "./useMascotRig";

type SceneProps = { frame: DerivedValue<MascotFrame> };

const VIEW_BOTTOM = ART_VIEW.y + ART_VIEW.height;
const VIEW_RIGHT = ART_VIEW.x + ART_VIEW.width;
const TWO_PI = Math.PI * 2;

const BURROW_EDGE_Y = 1010;
const WATER_LINE_Y = 760;

const moundPath = Skia.Path.MakeFromSVGString(
  `M ${ART_VIEW.x} ${VIEW_BOTTOM} L ${ART_VIEW.x} ${BURROW_EDGE_Y + 24} C 340 ${BURROW_EDGE_Y - 34} 480 ${BURROW_EDGE_Y - 8} 630 ${BURROW_EDGE_Y} C 780 ${BURROW_EDGE_Y - 8} 920 ${BURROW_EDGE_Y - 34} ${VIEW_RIGHT} ${BURROW_EDGE_Y + 24} L ${VIEW_RIGHT} ${VIEW_BOTTOM} Z`,
)!;
const moundRimPath = Skia.Path.MakeFromSVGString(
  `M ${ART_VIEW.x} ${BURROW_EDGE_Y + 24} C 340 ${BURROW_EDGE_Y - 34} 480 ${BURROW_EDGE_Y - 8} 630 ${BURROW_EDGE_Y} C 780 ${BURROW_EDGE_Y - 8} 920 ${BURROW_EDGE_Y - 34} ${VIEW_RIGHT} ${BURROW_EDGE_Y + 24}`,
)!;
const waterPath = Skia.Path.MakeFromSVGString(
  `M ${ART_VIEW.x - 80} ${WATER_LINE_Y} q 60 -22 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 L ${VIEW_RIGHT + 80} ${VIEW_BOTTOM} L ${ART_VIEW.x - 80} ${VIEW_BOTTOM} Z`,
)!;

const SPARKLE_SPOTS = [
  { x: 330, y: 330 },
  { x: 935, y: 300 },
  { x: 285, y: 640 },
  { x: 985, y: 610 },
  { x: 470, y: 215 },
  { x: 815, y: 205 },
];
const THOUGHT_DOTS = [
  { x: 878, y: 335, radius: 10 },
  { x: 925, y: 286, radius: 14 },
  { x: 976, y: 232, radius: 19 },
];
const BUBBLE_COLUMNS = [505, 560, 630, 690, 750];
/** Around the two ends of the bill, where the electro-sensing happens. */
const SPARK_ANGLES = [-0.42, 0.3, Math.PI - 0.3, Math.PI + 0.42];
const COIN_DIRECTIONS = [
  { from: LEFT_CHEEK, x: -0.8, y: -0.75 },
  { from: LEFT_CHEEK, x: -1, y: -0.2 },
  { from: LEFT_CHEEK, x: -0.45, y: -1 },
  { from: RIGHT_CHEEK, x: 0.8, y: -0.75 },
  { from: RIGHT_CHEEK, x: 1, y: -0.2 },
  { from: RIGHT_CHEEK, x: 0.45, y: -1 },
];

/** The dark mouth of the burrow, drawn behind the bust. */
export function MascotSceneBack({ frame }: SceneProps) {
  const opacity = useDerivedValue(() => frame.get().burrow);
  return (
    <Oval x={300} y={BURROW_EDGE_Y - 62} width={660} height={150} color={palette.bg.deep} opacity={opacity} />
  );
}

/** Everything drawn in front of the bust: the burrow's bank, the water, and the small effects. */
export function MascotSceneFront({ frame }: SceneProps) {
  const burrowOpacity = useDerivedValue(() => frame.get().burrow);
  const burrowTransform = useDerivedValue(() => [{ translateY: (1 - frame.get().burrow) * 220 }]);
  const waterOpacity = useDerivedValue(() => frame.get().water);
  const waterTransform = useDerivedValue(() => [
    { translateX: Math.sin(frame.get().phase * TWO_PI) * 22 },
    { translateY: (1 - frame.get().water) * 420 },
  ]);

  const bubbles = useDerivedValue(() => {
    const { phase, water } = frame.get();
    const path = Skia.Path.Make();
    if (water < 0.05) return path;
    BUBBLE_COLUMNS.forEach((column, index) => {
      const rise = (phase + index / BUBBLE_COLUMNS.length) % 1;
      path.addCircle(column + Math.sin(rise * TWO_PI) * 10, VIEW_BOTTOM - 70 - rise * 300, (7 + (index % 3) * 4) * Math.sin(rise * Math.PI));
    });
    return path;
  });

  const sparkles = useDerivedValue(() => {
    const { phase, sparkles: amount } = frame.get();
    const path = Skia.Path.Make();
    if (amount < 0.05) return path;
    SPARKLE_SPOTS.forEach((spot, index) => {
      const size = 26 * amount * Math.max(0, Math.sin(((phase + index / SPARKLE_SPOTS.length) % 1) * Math.PI));
      const waist = size * 0.22;
      path.moveTo(spot.x, spot.y - size);
      path.lineTo(spot.x + waist, spot.y - waist);
      path.lineTo(spot.x + size, spot.y);
      path.lineTo(spot.x + waist, spot.y + waist);
      path.lineTo(spot.x, spot.y + size);
      path.lineTo(spot.x - waist, spot.y + waist);
      path.lineTo(spot.x - size, spot.y);
      path.lineTo(spot.x - waist, spot.y - waist);
      path.close();
    });
    return path;
  });
  const sparkleColor = useDerivedValue(() => (frame.get().glow > 0.5 ? palette.brand.glow : palette.brand.js));

  const thoughts = useDerivedValue(() => {
    const { phase, thoughts: amount } = frame.get();
    const path = Skia.Path.Make();
    if (amount < 0.05) return path;
    THOUGHT_DOTS.forEach((dot, index) => {
      path.addCircle(dot.x, dot.y, dot.radius * amount * (0.65 + 0.35 * Math.sin((phase * 2 - index * 0.18) * TWO_PI)));
    });
    return path;
  });

  const sleepLetters = useDerivedValue(() => {
    const { phase, sleepLetters: amount } = frame.get();
    const path = Skia.Path.Make();
    if (amount < 0.05) return path;
    for (let index = 0; index < 3; index += 1) {
      const rise = (phase + index / 3) % 1;
      const size = (20 + rise * 30) * amount * Math.sin(rise * Math.PI);
      const left = 800 + rise * 130;
      const top = 760 - rise * 250;
      path.moveTo(left, top);
      path.lineTo(left + size, top);
      path.lineTo(left, top + size);
      path.lineTo(left + size, top + size);
    }
    return path;
  });

  const sparks = useDerivedValue(() => {
    const { flicker, sparks: amount, billJitterX } = frame.get();
    const path = Skia.Path.Make();
    if (amount < 0.05) return path;
    SPARK_ANGLES.forEach((angle, index) => {
      const reach = 62 * amount * (0.45 + 0.55 * Math.abs(Math.sin((flicker + index * 0.27) * TWO_PI)));
      const startX = BILL_VOLUME.x + billJitterX + Math.cos(angle) * (BILL_VOLUME.radiusX + 14);
      const startY = BILL_VOLUME.y + 8 + Math.sin(angle) * (BILL_VOLUME.radiusY + 14);
      const stepX = Math.cos(angle) * reach;
      const stepY = Math.sin(angle) * reach;
      path.moveTo(startX, startY);
      path.lineTo(startX + stepX * 0.45 - stepY * 0.35, startY + stepY * 0.45 + stepX * 0.35);
      path.lineTo(startX + stepX * 0.6 + stepY * 0.25, startY + stepY * 0.6 - stepX * 0.25);
      path.lineTo(startX + stepX, startY + stepY);
    });
    return path;
  });

  const coins = useDerivedValue(() => {
    const { burst } = frame.get();
    const path = Skia.Path.Make();
    if (burst <= 0 || burst >= 1) return path;
    COIN_DIRECTIONS.forEach((coin) => {
      path.addCircle(coin.from.x + coin.x * burst * 250, coin.from.y + coin.y * burst * 250 + burst * burst * 190, 15 * (1 - burst * 0.35));
    });
    return path;
  });
  const coinOpacity = useDerivedValue(() => Math.sin(Math.min(1, Math.max(0, frame.get().burst)) * Math.PI));

  return (
    <>
      <Group opacity={waterOpacity} transform={waterTransform}>
        <Path path={waterPath}>
          <LinearGradient
            start={vec(0, WATER_LINE_Y - 20)}
            end={vec(0, VIEW_BOTTOM)}
            colors={[scene.waterTop, scene.waterMiddle, scene.waterBottom]}
            positions={[0, 0.5, 1]}
          />
        </Path>
      </Group>
      <Path path={bubbles} color={scene.bubble} style="stroke" strokeWidth={3} />
      <Group opacity={burrowOpacity} transform={burrowTransform}>
        <Path path={moundPath}>
          <LinearGradient start={vec(0, BURROW_EDGE_Y - 34)} end={vec(0, VIEW_BOTTOM)} colors={[scene.burrowTop, palette.bg.surface]} />
        </Path>
        <Path path={moundRimPath} color={scene.moundRim} style="stroke" strokeWidth={4} />
      </Group>
      <Path path={sparkles} color={sparkleColor} />
      <Path path={thoughts} color={palette.text.secondary} />
      <Path path={sleepLetters} color={palette.text.secondary} style="stroke" strokeWidth={6} strokeJoin="round" strokeCap="round" />
      <Path path={sparks} color={palette.brand.js} style="stroke" strokeWidth={7} strokeJoin="round" strokeCap="round" />
      <Path path={coins} color={palette.brand.js} opacity={coinOpacity} />
    </>
  );
}
