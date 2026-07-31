import { StyleSheet } from "react-native";
import { colors, spacing } from "@/theme/theme";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg },
  sectionStack: { gap: spacing.lg },
});
