import { useContext } from "react";
import { I18nManager, Text, type TextProps, type TextStyle } from "react-native";
import { PinnedLeftToRightContext } from "./LtrView";
import { MAX_FONT_SCALE, palette, typography, type TypographyVariant } from "@/theme/tokens";

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  /** "start" follows the language direction; code and numbers pass "ltr" to stay left-to-right. */
  align?: "start" | "center" | "ltr";
};

/**
 * React Native swaps "left" and "right" inside a right-to-left layout. Left-to-right text (code,
 * content, numbers) must sit on the physical left in both languages, so in a mirrored layout it
 * asks for "right" — unless an `LtrView` has already pinned its container to left to right.
 */
const MIRRORED_LAYOUT_LEFT: TextStyle = { textAlign: I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL ? "right" : "left", writingDirection: "ltr" };

const ALIGNMENT: Record<NonNullable<Props["align"]>, TextStyle> = {
  // React Native swaps "left" and "right" in right-to-left layouts, so "left" means "start".
  start: { textAlign: "left" },
  center: { textAlign: "center" },
  ltr: { textAlign: "left", writingDirection: "ltr" },
};

/** Every piece of text in the app: one type scale, token colours, and a cap on system text scaling. */
export function AppText({ variant = "body", color = palette.text.primary, align = "start", style, ...textProps }: Props) {
  const pinned = useContext(PinnedLeftToRightContext);
  const alignment = align === "ltr" && !pinned ? MIRRORED_LAYOUT_LEFT : ALIGNMENT[align];
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...textProps} style={[typography[variant], { color }, alignment, style]} />;
}
