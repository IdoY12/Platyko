import { Text, type TextProps, type TextStyle } from "react-native";
import { MAX_FONT_SCALE, palette, typography, type TypographyVariant } from "@/theme/tokens";

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  /** "start" follows the language direction; code and numbers pass "ltr" to stay left-to-right. */
  align?: "start" | "center" | "ltr";
};

const ALIGNMENT: Record<NonNullable<Props["align"]>, TextStyle> = {
  // React Native swaps "left" and "right" in right-to-left layouts, so "left" means "start".
  start: { textAlign: "left" },
  center: { textAlign: "center" },
  ltr: { textAlign: "left", writingDirection: "ltr" },
};

/** Every piece of text in the app: one type scale, token colours, and a cap on system text scaling. */
export function AppText({ variant = "body", color = palette.text.primary, align = "start", style, ...textProps }: Props) {
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...textProps} style={[typography[variant], { color }, ALIGNMENT[align], style]} />;
}
