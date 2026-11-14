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

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40, giant: 48, massive: 64,
};

export const radius = { chip: 4, button: 8, card: 10, modal: 14, pill: 999 };

export const fontSize = { xs: 12, sm: 14, base: 16, md: 18, lg: 22, xl: 28, xxl: 36, xxxl: 48 };

/** Monospace is the primary voice: headings, numbers, labels — the whole deck talks in code. */
export const font = {
  mono: Platform.select({ ios: "Menlo", default: "monospace" }),
};
