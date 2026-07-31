import { Platform } from "react-native";

/** CYBERDECK × JS art direction: hacker terminal in JavaScript colors — JS-yellow phosphor
 *  on warm near-black, magenta (duel) and cyan (XP/info) as sparing signal accents. */
export const colors = {
  background: "#0A0A08",
  card: "#14130E",
  surface: "#1C1A12",
  accent: "#F7DF1E",
  onAccent: "#131309",
  cyan: "#21E6F5",
  success: "#4ADE80",
  danger: "#FF4D6D",
  duel: "#FF2E88",
  textPrimary: "#F2EFE4",
  textSecondary: "#A8A494",
  textMuted: "#5F5B4C",
  border: "rgba(247,223,30,0.16)",
};

/** Translucent washes for selected / correct / wrong states — every tint stays on-palette. */
export const tint = {
  accent: "rgba(247,223,30,0.12)",
  cyan: "rgba(33,230,245,0.12)",
  duel: "rgba(255,46,136,0.14)",
  danger: "rgba(255,77,109,0.16)",
  success: "rgba(74,222,128,0.14)",
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40, giant: 48, massive: 64,
};

export const radius = { chip: 4, button: 8, card: 10, modal: 14, pill: 999 };

export const fontSize = { xs: 12, sm: 14, base: 16, md: 18, lg: 22, xl: 28, xxl: 36, xxxl: 48 };

/** Monospace is the primary voice: headings, numbers, labels — the whole deck talks in code. */
export const font = {
  mono: Platform.select({ ios: "Menlo", default: "monospace" }) as string,
};

const neon = (shadowColor: string) => ({
  shadowColor,
  shadowOpacity: 0.45,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
});

/** Neon glow shadow presets for buttons, bars, and the tab indicator. */
export const glow = { accent: neon(colors.accent), cyan: neon(colors.cyan), duel: neon(colors.duel) };

/** Shared motion feel: physical springs, boot-up stagger, and terminal effect timing. */
export const motion = {
  pressScale: 0.97,
  spring: { damping: 18, stiffness: 260 },
  springSoft: { damping: 40, stiffness: 60 },
  bootStaggerMs: 55,
  scrambleMs: 420,
  rain: { columnMax: 20, columnWidth: 18, fallMsMin: 2800, fallMsMax: 6200, glyphLineHeight: 18 },
};
