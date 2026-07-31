import { StyleSheet } from "react-native";
import { font, fontSize } from "@/theme/theme";

export const styles = StyleSheet.create({
  center: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    position: "absolute",
    fontFamily: font.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
});
