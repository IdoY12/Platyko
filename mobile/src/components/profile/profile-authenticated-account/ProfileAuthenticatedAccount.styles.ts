import { StyleSheet } from "react-native";
import { colors, fontSize, spacing } from "@/theme/theme";

export const a = StyleSheet.create({
  cardStack: { gap: spacing.sm },
  rowPress: { opacity: 0.75 },
  chev: { color: colors.textSecondary, fontSize: fontSize.lg },
});
