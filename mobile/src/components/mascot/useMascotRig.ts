import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from "react-native-reanimated";
import { duration } from "@/theme/tokens";
import { MASCOT_POSES, type MascotPose } from "./mascotPoses";
import { clampMood, MASCOT_STATES, streakWarmth, type MascotState } from "./mascotStates";

/** Everything the canvas needs to draw one frame, in artwork pixels, degrees and 0..1 amounts. */
export type MascotFrame = MascotPose & {
  bustScaleX: number;
  bustScaleY: number;
  billJitterX: number;
  tuftSway: number;
  /** 0..1 progress of the XP burst that leaves the cheeks during a cheer. */
  burst: number;
  /** Looping 0..1 phase that drives bubbles, sparkles, thought dots and sleep letters. */
  phase: number;
  /** Fast 0..1 phase for the sparks. */
  flicker: number;
  warmth: number;
};

/** How long each state's entrance motion lasts; a state without one settles in the pose only. */
const ENTRANCE_DURATION: Record<MascotState, number> = {
  idle: 0,
  wave: 1400,
  think: 0,
  sense: 0,
  cheer: 1100,
  comfort: 1800,
  dive: 0,
  glow: 0,
  hide: 0,
  sleep: 0,
  victory: 0,
  defeat: 1200,
};

const BLINK_GAP_MIN_MS = 2400;
const BLINK_GAP_MAX_MS = 5600;
const TWO_PI = Math.PI * 2;

function bell(progress: number, start: number, end: number): number {
  "worklet";
  if (progress <= start || progress >= end) return 0;
  return Math.sin(((progress - start) / (end - start)) * Math.PI);
}

function blendPoses(from: MascotPose, to: MascotPose, amount: number): MascotPose {
  "worklet";
  const blended = { ...to };
  for (const key in to) {
    const joint = key as keyof MascotPose;
    blended[joint] = from[joint] + (to[joint] - from[joint]) * amount;
  }
  return blended;
}

function useLoop(active: boolean, halfPeriodMs: number, backAndForth: boolean): SharedValue<number> {
  const value = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    value.set(
      withRepeat(
        withTiming(1, { duration: halfPeriodMs, easing: backAndForth ? Easing.inOut(Easing.sin) : Easing.linear }),
        -1,
        backAndForth,
      ),
    );
    return () => {
      cancelAnimation(value);
      value.set(0);
    };
  }, [active, backAndForth, halfPeriodMs, value]);
  return value;
}

/**
 * Drives the mascot. A state change blends from wherever the character is to the new pose and
 * plays that state's entrance once; independent loops (breathing, drifting, blinking, tuft sway)
 * add life on top with different periods so the motion never visibly repeats. Loops stop while
 * `active` is false and never start under Reduce Motion, which leaves the static pose.
 */
export function useMascotRig(state: MascotState, streakLength: number, mood: number, active: boolean): DerivedValue<MascotFrame> {
  const reducedMotion = useReducedMotion();
  const alive = active && !reducedMotion;

  const stateIndex = useSharedValue(MASCOT_STATES.indexOf(state));
  const fromPose = useSharedValue<MascotPose>(MASCOT_POSES[state]);
  const toPose = useSharedValue<MascotPose>(MASCOT_POSES[state]);
  const blend = useSharedValue(1);
  const entrance = useSharedValue(1);
  const blink = useSharedValue(0);
  const moodValue = useSharedValue(clampMood(mood));
  const warmth = useSharedValue(streakWarmth(streakLength));

  const breath = useLoop(alive, 1700, true);
  const driftAcross = useLoop(alive, 2650, true);
  const driftUp = useLoop(alive, 3550, true);
  const tuft = useLoop(alive, 1450, true);
  const phase = useLoop(alive, 2600, false);
  const beat = useLoop(alive, 900, false);
  const flicker = useLoop(alive, 90, false);

  const pose = useDerivedValue(() => blendPoses(fromPose.get(), toPose.get(), blend.get()));

  useEffect(() => {
    stateIndex.set(MASCOT_STATES.indexOf(state));
  }, [state, stateIndex]);

  useEffect(() => {
    moodValue.set(withTiming(clampMood(mood), { duration: duration.emphasis }));
    warmth.set(withTiming(streakWarmth(streakLength), { duration: duration.emphasis }));
  }, [mood, moodValue, streakLength, warmth]);

  useAnimatedReaction(
    () => stateIndex.get(),
    (next, previous) => {
      if (previous === null || next === previous) return;
      const nextState = MASCOT_STATES[next];
      fromPose.set(pose.get());
      toPose.set(MASCOT_POSES[nextState]);
      blend.set(0);
      blend.set(withTiming(1, { duration: duration.emphasis, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
      entrance.set(0);
      entrance.set(withTiming(1, { duration: ENTRANCE_DURATION[nextState], easing: Easing.linear }));
    },
  );

  useEffect(() => {
    if (!alive) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        blink.set(withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 130 })));
        scheduleBlink();
      }, BLINK_GAP_MIN_MS + Math.random() * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS));
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, [alive, blink]);

  return useDerivedValue<MascotFrame>(() => {
    const current = pose.get();
    const currentState = MASCOT_STATES[stateIndex.get()];
    const progress = entrance.get();
    const settled = blend.get();
    const energy = 1 + moodValue.get() * 0.35;
    const worry = Math.max(0, -moodValue.get());
    const tucked = Math.max(current.burrow, current.water);
    const swing = Math.sin(beat.get() * TWO_PI);
    const turnAcross = (driftAcross.get() - 0.5) * 2 * (1 - tucked);
    const turnUp = (driftUp.get() - 0.5) * 2 * (1 - tucked);

    const frame: MascotFrame = {
      ...current,
      bustScaleX: 1,
      bustScaleY: 1 + breath.get() * (currentState === "sleep" ? 0.02 : 0.008),
      billJitterX: 0,
      tuftSway: (tuft.get() - 0.5) * 7 * energy,
      burst: 0,
      phase: phase.get(),
      flicker: flicker.get(),
      warmth: warmth.get(),
    };
    frame.headYaw += turnAcross * 0.22 * energy;
    frame.headPitch += turnUp * 0.12 + worry * 0.18;
    frame.headTilt += turnAcross * 1.3;
    frame.headOffsetY += breath.get() * 3 + worry * 4;
    frame.upperLids = Math.max(frame.upperLids + worry * 0.1, blink.get());
    frame.browTilt += worry * 6;

    if (currentState === "wave") {
      const bob = Math.sin(progress * TWO_PI * 2) * (1 - progress);
      frame.headOffsetY += bob * 14;
      frame.headTilt += bob * 4;
    } else if (currentState === "cheer") {
      const airborne = bell(progress, 0.22, 0.72);
      frame.cheekPuff += bell(progress, 0, 0.34);
      frame.bustOffsetY -= airborne * 96;
      frame.bustScaleY += airborne * 0.05 - bell(progress, 0, 0.24) * 0.06 - bell(progress, 0.7, 0.92) * 0.07;
      frame.bustScaleX += bell(progress, 0, 0.24) * 0.04 + bell(progress, 0.7, 0.92) * 0.05 - airborne * 0.03;
      frame.burst = Math.min(1, Math.max(0, (progress - 0.3) / 0.6));
    } else if (currentState === "comfort") {
      frame.headPitch += Math.sin(progress * TWO_PI * 2) * 0.32 * (1 - progress * 0.5) * settled;
    } else if (currentState === "defeat") {
      const shrug = bell(progress, 0.08, 0.62);
      frame.bustOffsetY -= shrug * 18;
      frame.bustScaleX += shrug * 0.025;
    } else if (currentState === "victory") {
      frame.bustRotation += swing * 4 * settled;
      frame.bustOffsetY -= Math.abs(swing) * 26 * settled;
      frame.headTilt -= swing * 6 * settled;
    } else if (currentState === "sense") {
      frame.billJitterX = Math.sin(flicker.get() * TWO_PI) * 2.4;
    } else if (currentState === "think") {
      frame.billOpen += (0.5 + 0.5 * Math.sin(phase.get() * TWO_PI * 2)) * 3;
    } else if (currentState === "hide") {
      frame.gazeX += Math.sin(phase.get() * TWO_PI) * 16 + 9;
    } else if (currentState === "glow") {
      frame.bustOffsetY += Math.sin(phase.get() * TWO_PI) * 6;
    }
    return frame;
  });
}
