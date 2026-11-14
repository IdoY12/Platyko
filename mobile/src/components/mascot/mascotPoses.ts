import type { MascotState } from "./mascotStates";

/**
 * A pose is the resting value of every joint for a state. Distances are in the artwork's own
 * pixels (the logo is 1254 wide), rotations in degrees, and lids, turns and scene layers run
 * from 0 to 1 (turns from -1 to 1). Under Reduce Motion the mascot shows exactly this pose and
 * nothing moves; with motion on, the rig eases into the pose and adds the state's motion on top.
 *
 * The artwork is a bust, so states that would need limbs are expressed with the head, brows,
 * eyes and the whole bust (PRD 13.4): `wave` is a greeting tilt, `victory` a dance, `defeat` a
 * shrug of the shoulders.
 */
export type MascotPose = {
  /** Whole bust: down is positive. Used by the hop, the dive and the burrow. */
  bustOffsetY: number;
  bustRotation: number;
  /** Head roll around the neck, and its turn left/right and up/down (drives the depth warp). */
  headTilt: number;
  headYaw: number;
  headPitch: number;
  headOffsetY: number;
  /** 0 open, 1 closed. The lower lids rise for a smiling squint. */
  upperLids: number;
  lowerLids: number;
  gazeX: number;
  gazeY: number;
  /** Negative lifts a brow. `browTilt` raises the inner ends for a kind, soft look. */
  browLeftOffsetY: number;
  browRightOffsetY: number;
  browTilt: number;
  billOpen: number;
  cheekPuff: number;
  /** Scene layers, 0 hidden to 1 shown. */
  glow: number;
  burrow: number;
  water: number;
  sparks: number;
  thoughts: number;
  sleepLetters: number;
  sparkles: number;
};

const REST: MascotPose = {
  bustOffsetY: 0,
  bustRotation: 0,
  headTilt: 0,
  headYaw: 0,
  headPitch: 0,
  headOffsetY: 0,
  upperLids: 0,
  lowerLids: 0,
  gazeX: 0,
  gazeY: 0,
  browLeftOffsetY: 0,
  browRightOffsetY: 0,
  browTilt: 0,
  billOpen: 0,
  cheekPuff: 0,
  glow: 0,
  burrow: 0,
  water: 0,
  sparks: 0,
  thoughts: 0,
  sleepLetters: 0,
  sparkles: 0,
};

const SMILING_EYES = { upperLids: 0, lowerLids: 0.5 };

export const MASCOT_POSES: Record<MascotState, MascotPose> = {
  idle: REST,
  wave: { ...REST, ...SMILING_EYES, headTilt: 9, headYaw: 0.35, browLeftOffsetY: -10, browRightOffsetY: -10, billOpen: 5 },
  think: { ...REST, headTilt: -8, headYaw: -0.3, headPitch: -0.25, gazeX: 9, gazeY: -9, browRightOffsetY: -14, browLeftOffsetY: 4, thoughts: 1 },
  sense: { ...REST, headPitch: 0.45, headOffsetY: 6, upperLids: 0.18, gazeX: 0, gazeY: 10, browLeftOffsetY: 7, browRightOffsetY: 7, browTilt: -6, sparks: 1 },
  cheer: { ...REST, ...SMILING_EYES, headPitch: -0.3, browLeftOffsetY: -12, browRightOffsetY: -12, billOpen: 9, sparkles: 1 },
  comfort: { ...REST, headTilt: -7, headPitch: 0.2, upperLids: 0.26, lowerLids: 0.14, browTilt: 9, browLeftOffsetY: -4, browRightOffsetY: -4, billOpen: 2 },
  dive: { ...REST, bustOffsetY: 545, headPitch: 0.5, upperLids: 1, water: 1 },
  glow: { ...REST, ...SMILING_EYES, bustOffsetY: -10, headPitch: -0.2, glow: 1, sparkles: 1, billOpen: 4 },
  hide: { ...REST, bustOffsetY: 345, headPitch: -0.35, upperLids: 0.1, gazeX: -9, browLeftOffsetY: -8, browRightOffsetY: -8, burrow: 1 },
  sleep: { ...REST, bustOffsetY: 372, headTilt: 9, headPitch: 0.4, upperLids: 1, browTilt: 5, burrow: 1, sleepLetters: 1 },
  victory: { ...REST, ...SMILING_EYES, bustOffsetY: -12, headPitch: -0.35, browLeftOffsetY: -14, browRightOffsetY: -14, billOpen: 10, sparkles: 1 },
  defeat: { ...REST, headTilt: 8, headPitch: 0.25, upperLids: 0.3, browTilt: 11, browLeftOffsetY: -3, browRightOffsetY: -3, billOpen: 1 },
};
