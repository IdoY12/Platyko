import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LessonState } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { glowShadow, LIP_HEIGHT, palette, radii, space } from "@/theme/tokens";

type Props = {
  title: string;
  state: LessonState;
  /** 0..1 for a lesson in progress. */
  progress: number;
  onPress: () => void;
};

const NODE_SIZE = 72;
const RING_STROKE = 5;
const RING_RADIUS = NODE_SIZE / 2 + 6;

const FACE: Record<LessonState, { face: string; lip: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; iconColour: string }> = {
  locked: { face: palette.bg.raised, lip: palette.bg.surface, icon: "lock", iconColour: palette.text.muted },
  available: { face: palette.brand.primary, lip: palette.brand.primaryDeep, icon: "play", iconColour: palette.text.onBright },
  inProgress: { face: palette.brand.primary, lip: palette.brand.primaryDeep, icon: "play", iconColour: palette.text.onBright },
  completed: { face: palette.state.success, lip: palette.state.successDeep, icon: "check-bold", iconColour: palette.text.onBright },
  mastered: { face: palette.brand.glow, lip: "#0FA3AE", icon: "star", iconColour: palette.text.onBright },
};

/**
 * One lesson on the map (PRD 12.6): locked, available (pulsing), in progress (a ring), completed,
 * or mastered (glowing). The node is a raised disc on a lip, like the buttons.
 */
export function LessonNode({ title, state, progress, onPress }: Props) {
  const look = FACE[state];
  const circumference = 2 * Math.PI * RING_RADIUS;
  return (
    <View style={styles.wrapper}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t("map.lessonLabel", { title, state: t(`map.state.${state}`) })}
        accessibilityState={{ disabled: state === "locked" }}
        disabled={state === "locked"}
        haptic="light"
        onPress={onPress}
        style={styles.pressable}
      >
        {state === "available" ? (
          // Draws the eye to the one lesson to do next; a CSS loop on the UI thread, skipped under Reduce Motion.
          <Animated.View
            style={[
              styles.pulse,
              {
                animationName: { from: { transform: [{ scale: 1 }], opacity: 0.55 }, to: { transform: [{ scale: 1.45 }], opacity: 0 } },
                animationDuration: 1800,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-out",
              },
            ]}
          />
        ) : null}
        {state === "inProgress" ? (
          <Svg width={RING_RADIUS * 2 + RING_STROKE} height={RING_RADIUS * 2 + RING_STROKE} style={styles.ring}>
            <Circle cx={RING_RADIUS + RING_STROKE / 2} cy={RING_RADIUS + RING_STROKE / 2} r={RING_RADIUS} stroke={palette.bg.raised} strokeWidth={RING_STROKE} fill="none" />
            <Circle
              cx={RING_RADIUS + RING_STROKE / 2}
              cy={RING_RADIUS + RING_STROKE / 2}
              r={RING_RADIUS}
              stroke={palette.brand.js}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={circumference * (1 - Math.max(0.05, progress))}
              transform={`rotate(-90 ${RING_RADIUS + RING_STROKE / 2} ${RING_RADIUS + RING_STROKE / 2})`}
            />
          </Svg>
        ) : null}
        <View style={[styles.lip, { backgroundColor: look.lip }]} />
        <View style={[styles.face, { backgroundColor: look.face }, state === "mastered" && glowShadow(palette.brand.glow)]}>
          <MaterialCommunityIcons name={look.icon} size={30} color={look.iconColour} />
        </View>
      </PressableScale>
      <AppText variant="label" align="center" color={state === "locked" ? palette.text.muted : palette.text.secondary} numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: 128, alignItems: "center", gap: space.sm },
  pressable: { width: NODE_SIZE + 24, height: NODE_SIZE + 24 + LIP_HEIGHT, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: NODE_SIZE, height: NODE_SIZE, borderRadius: radii.pill, backgroundColor: palette.brand.primary },
  ring: { position: "absolute" },
  lip: { position: "absolute", width: NODE_SIZE, height: NODE_SIZE, borderRadius: radii.pill, transform: [{ translateY: LIP_HEIGHT + 1 }] },
  face: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  title: { maxWidth: 128 },
});
