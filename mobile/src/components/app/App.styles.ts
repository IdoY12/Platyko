import { StyleSheet } from "react-native";
import { palette, radii, space, typography } from "@/theme/tokens";

export const styles = StyleSheet.create({
  root: { flex: 1 },
  crashScreen: { flex: 1, backgroundColor: palette.bg.base, alignItems: "center", justifyContent: "center", padding: space.xxl, gap: space.lg },
  crashTitle: { ...typography.screenTitle, color: palette.text.primary, textAlign: "center" },
  crashBody: { ...typography.body, color: palette.text.secondary, textAlign: "center" },
  crashButton: { marginTop: space.lg, backgroundColor: palette.brand.primary, paddingVertical: space.md, paddingHorizontal: space.xxl, borderRadius: radii.button },
  crashButtonLabel: { ...typography.button, color: palette.text.onBright },
});
