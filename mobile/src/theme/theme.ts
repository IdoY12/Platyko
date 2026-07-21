import { Platform } from "react-native";

/** Editor-grade art direction: warm ink ground, hairline borders, JS-yellow signature accent. */
export const colors = {
  background: "#0B0B0C",
  card: "#151517",
  surface: "#1C1C1F",
  accent: "#F7DF1E",
  onAccent: "#131309",
  success: "#4ADE80",
  danger: "#F87171",
  duel: "#FF4E6A",
  textPrimary: "#F2F2F0",
  textSecondary: "#A0A0A8",
  textMuted: "#5C5C66",
  border: "rgba(255,255,255,0.09)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
  massive: 64,
};

export const radius = {
  chip: 6,
  button: 12,
  card: 16,
  modal: 24,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
  xxxl: 48,
};

/** Monospace is the accent voice: code, meta-labels, and numbers that matter. */
export const font = {
  mono: Platform.select({ ios: "Menlo", default: "monospace" }) as string,
};

/** Shared motion feel: quick physical springs, subtle press scale. */
export const motion = {
  pressScale: 0.97,
  spring: { damping: 18, stiffness: 260 },
};
