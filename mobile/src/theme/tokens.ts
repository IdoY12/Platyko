/**
 * "The river at night" design system (PRD section 12): deep navy water, the warm orange of the
 * platypus's bill for the primary action, JavaScript yellow for XP, and a cyan glow kept for
 * special moments. Every colour, size and duration used by a screen comes from this file.
 */

export const palette = {
  bg: {
    base: "#080930",
    surface: "#12143F",
    raised: "#1B1E55",
    code: "#0B0C2A",
    /** Deepest water, used as the far stop of background gradients. */
    deep: "#04051C",
  },
  brand: {
    primary: "#FF8A3D",
    /** The dark lip under a primary button and its pressed face. */
    primaryDeep: "#C4571A",
    js: "#F7DF1E",
    jsDeep: "#B8A30B",
    glow: "#21E6F5",
    /** The dark lip under a cyan (mastered) node. */
    glowDeep: "#0FA3AE",
  },
  state: {
    success: "#4ADE80",
    successDeep: "#1E8A49",
    danger: "#FF4D6D",
    dangerDeep: "#B3243F",
  },
  text: {
    primary: "#F4F3FF",
    secondary: "#B6B8DE",
    muted: "#8F92C4",
    /** Text placed on the orange, yellow, green and cyan fills. */
    onBright: "#080930",
  },
  line: {
    subtle: "rgba(182,184,222,0.14)",
    strong: "rgba(182,184,222,0.32)",
  },
} as const;

/** Translucent washes for selected, correct, wrong and glow states. */
export const wash = {
  primary: "rgba(255,138,61,0.16)",
  js: "rgba(247,223,30,0.14)",
  glow: "rgba(33,230,245,0.14)",
  success: "rgba(74,222,128,0.16)",
  danger: "rgba(255,77,109,0.18)",
  scrim: "rgba(4,5,28,0.72)",
  /** The activity map's busier days. */
  activityMid: "rgba(255,138,61,0.35)",
  activityHigh: "rgba(255,138,61,0.65)",
} as const;

/**
 * Colours of drawn scenery (the river, the burrow, the tab bar's glass) and of the mascot artwork
 * itself (sampled from the logo). They are not text or control colours, so they sit apart from the
 * palette; transparent ends of gradients fade the colour they belong to.
 */
export const scene = {
  riverPath: "rgba(33,230,245,0.22)",
  riverDash: "rgba(182,184,222,0.35)",
  riverBank: "rgba(27,30,85,0.55)",
  tabBarGlass: "rgba(27,30,85,0.94)",
  cyanPool: "rgba(33,230,245,0.11)",
  cyanFade: "rgba(33,230,245,0)",
  orangeFade: "rgba(255,138,61,0)",
  indigoPool: "rgba(96,104,255,0.16)",
  indigoFade: "rgba(96,104,255,0)",
  mote: "rgba(182,184,222,0.32)",
  waterTop: "rgba(33,230,245,0.3)",
  waterMiddle: "rgba(27,60,120,0.5)",
  waterBottom: "rgba(8,9,48,0.9)",
  bubble: "rgba(159,216,255,0.75)",
  burrowTop: "#2E327F",
  moundRim: "rgba(182,184,222,0.4)",
  eyelid: "#3B1C0B",
  mouth: "#4A1A10",
} as const;

/** Syntax colours for the code view; each one is checked against `bg.code` for contrast. */
export const syntax = {
  plain: "#E6E7FF",
  keyword: "#FF9D5C",
  string: "#8EE6A8",
  number: "#F7DF1E",
  comment: "#8F92C4",
  operator: "#9FD8FF",
  functionName: "#6FE9F5",
  punctuation: "#B6B8DE",
  lineNumber: "#8F92C4",
} as const;

const fontFamily = {
  ui: { medium: "Rubik_500Medium", semiBold: "Rubik_600SemiBold", bold: "Rubik_700Bold", extraBold: "Rubik_800ExtraBold" },
  code: { medium: "JetBrainsMono_500Medium", bold: "JetBrainsMono_700Bold" },
} as const;

/** Type scale (PRD 12.3). Sizes scale with the system setting up to `MAX_FONT_SCALE`. */
export const typography = {
  display: { fontFamily: fontFamily.ui.extraBold, fontSize: 34, lineHeight: 40 },
  screenTitle: { fontFamily: fontFamily.ui.extraBold, fontSize: 28, lineHeight: 34 },
  cardTitle: { fontFamily: fontFamily.ui.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fontFamily.ui.medium, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.ui.semiBold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.ui.semiBold, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fontFamily.ui.bold, fontSize: 17, lineHeight: 22 },
  code: { fontFamily: fontFamily.code.medium, fontSize: 15, lineHeight: 24 },
  codeSmall: { fontFamily: fontFamily.code.medium, fontSize: 13, lineHeight: 20 },
  number: { fontFamily: fontFamily.code.bold, fontSize: 17, lineHeight: 22 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const MAX_FONT_SCALE = 1.3;

/** Spacing on a scale of 4 (PRD 12.4). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const SCREEN_MARGIN = 20;
/** Space kept below scrolling content so its end clears the floating tab bar. */
export const TAB_BAR_CLEARANCE = 140;
export const MIN_TOUCH_TARGET = 48;

export const radii = { chip: 8, button: 14, card: 20, sheet: 28, pill: 999 } as const;

/** The pressable "bottom lip" that gives buttons a tactile 3D feel without 3D rendering. */
export const LIP_HEIGHT = 4;

/** Three depth levels only. Glow is a coloured, offset-free shadow used for milestone moments. */
export const depth = {
  flat: {},
  raised: { shadowColor: palette.bg.deep, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  floating: { shadowColor: palette.bg.deep, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
} as const;

/** A sheet pinned to the bottom of the screen, over the content (lesson feedback, a game's round end). */
export const bottomSheet = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  gap: space.md,
  padding: space.xl,
  paddingBottom: space.xxl,
  backgroundColor: palette.bg.raised,
  borderTopLeftRadius: radii.sheet,
  borderTopRightRadius: radii.sheet,
  borderTopWidth: 3,
  ...depth.floating,
} as const;

export function glowShadow(color: string) {
  return { shadowColor: color, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 };
}

/** Motion language (PRD 12.7): four durations, and springs only where a finger is involved. */
export const duration = { micro: 120, transition: 220, emphasis: 360, celebration: 1200 } as const;

export const springs = {
  settle: { duration: 400, dampingRatio: 1 },
  snapBack: { duration: 400, dampingRatio: 0.8 },
  sheet: { duration: 300, dampingRatio: 0.8 },
} as const;

export const PRESS_SCALE = 0.97;

/**
 * State-driven transitions (Reanimated CSS transitions). They are applied inline on animated
 * views; a press or a colour change needs no shared value.
 */
export const transitions = {
  press: { transitionProperty: "transform", transitionDuration: duration.micro, transitionTimingFunction: "ease-out" },
  colour: { transitionProperty: "backgroundColor", transitionDuration: duration.transition, transitionTimingFunction: "ease-out" },
} as const;
