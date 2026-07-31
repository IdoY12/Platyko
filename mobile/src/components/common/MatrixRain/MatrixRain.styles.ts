import { StyleSheet } from "react-native";
import { colors, font, fontSize, motion } from "@/theme/theme";

export const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  column: { position: "absolute", top: 0 },
  glyphs: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    lineHeight: motion.rain.glyphLineHeight,
    textAlign: "center",
  },
});
