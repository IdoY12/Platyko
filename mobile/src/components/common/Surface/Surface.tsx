import { StyleSheet, View, type ViewProps } from "react-native";
import { depth, palette, radii, space } from "@/theme/tokens";

type Props = ViewProps & {
  /** "surface" is a card on the page; "raised" sits above cards (sheets, selected items). */
  level?: "surface" | "raised";
};

/** A rounded card on the river: one of the three depth levels, a hairline edge, generous padding. */
export function Surface({ level = "surface", style, ...viewProps }: Props) {
  return <View {...viewProps} style={[styles.base, level === "raised" ? styles.raised : styles.surface, style]} />;
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.card, padding: space.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line.subtle },
  surface: { backgroundColor: palette.bg.surface, ...depth.raised },
  raised: { backgroundColor: palette.bg.raised, ...depth.floating },
});
