import { StyleSheet } from "react-native";
import { colors, radius } from "@/theme/theme";

export const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
  },
});
