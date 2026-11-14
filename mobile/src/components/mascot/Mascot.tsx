import { useEffect, useState } from "react";
import { AppState, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { MASCOT_ASPECT_RATIO } from "./mascotArt";
import { MascotCanvas } from "./MascotCanvas";
import type { MascotState } from "./mascotStates";
import { useMascotRig } from "./useMascotRig";

type Props = {
  /** One of the twelve states of the PRD 13.4 state machine. */
  state: MascotState;
  /** Days in the current streak; warms the halo and lifts the tuft. */
  streakLength: number;
  /** The learner's recent run of answers: -1 struggling, 0 neutral, 1 breezing through. */
  mood: number;
};

function useAppIsActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setActive(next === "active"));
    return () => subscription.remove();
  }, []);
  return active;
}

/**
 * The Platyko mascot: the logo platypus, alive. It fills the width of its parent and keeps the
 * artwork's proportions. The interface is the state and the two inputs and nothing else, so a
 * rigged 3D model can replace the layered artwork without touching any screen (PRD 13.2).
 */
export function Mascot({ state, streakLength, mood }: Props) {
  const [width, setWidth] = useState(0);
  const frame = useMascotRig(state, streakLength, mood, useAppIsActive());
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.frame} onLayout={onLayout} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      {width > 0 ? <MascotCanvas frame={frame} width={width} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The mascot is artwork, not layout: it is never mirrored in right-to-left languages.
  frame: { width: "100%", aspectRatio: MASCOT_ASPECT_RATIO, direction: "ltr" },
});
