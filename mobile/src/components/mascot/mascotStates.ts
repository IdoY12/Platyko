/**
 * The mascot's state machine (PRD 13.4): twelve named states and the transitions allowed between
 * them. Screens ask for a state; a request that is not a direct transition passes through `idle`,
 * so the character never snaps between unrelated poses.
 */

export const MASCOT_STATES = [
  "idle",
  "wave",
  "think",
  "sense",
  "cheer",
  "comfort",
  "dive",
  "glow",
  "hide",
  "sleep",
  "victory",
  "defeat",
] as const;

export type MascotState = (typeof MASCOT_STATES)[number];

/** States the character can move to directly. `idle` is reachable from, and leads to, every state. */
const DIRECT_TRANSITIONS: Record<MascotState, readonly MascotState[]> = {
  idle: MASCOT_STATES,
  wave: ["idle", "cheer", "think"],
  think: ["idle", "cheer", "comfort", "sense", "victory", "defeat"],
  sense: ["idle", "cheer", "comfort", "think"],
  cheer: ["idle", "glow", "victory", "wave"],
  comfort: ["idle", "cheer", "think"],
  dive: ["idle", "victory", "defeat", "think"],
  glow: ["idle", "cheer", "victory"],
  hide: ["idle", "wave", "sleep"],
  sleep: ["idle", "hide", "wave"],
  victory: ["idle", "glow", "cheer", "dive"],
  defeat: ["idle", "comfort", "dive"],
};

export function canTransitionDirectly(from: MascotState, to: MascotState): boolean {
  return from === to || DIRECT_TRANSITIONS[from].includes(to);
}

/** The states to play, in order, to get from `from` to `to`. */
export function mascotTransitionPath(from: MascotState, to: MascotState): MascotState[] {
  if (from === to) return [];
  return canTransitionDirectly(from, to) ? [to] : ["idle", to];
}

/** `mood` is the learner's recent run of answers: -1 struggling, 0 neutral, 1 breezing through. */
export function clampMood(mood: number): number {
  return Number.isFinite(mood) ? Math.max(-1, Math.min(1, mood)) : 0;
}

const STREAK_DAYS_FOR_FULL_WARMTH = 30;

/**
 * The real platypus stores its reserve in its tail; the bust has none, so the streak shows as the
 * warmth of the halo and the height of the tuft: 0 for no streak, 1 from thirty days on.
 */
export function streakWarmth(streakLength: number): number {
  if (!Number.isFinite(streakLength) || streakLength <= 0) return 0;
  return Math.min(1, Math.sqrt(streakLength / STREAK_DAYS_FOR_FULL_WARMTH));
}
