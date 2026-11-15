import { I18nManager, StyleSheet, TextInput, type TextInputProps } from "react-native";
import { MAX_FONT_SCALE, MIN_TOUCH_TARGET, palette, radii, space, typography } from "@/theme/tokens";

/**
 * A text field on the dark water; its text and placeholder start where the UI language starts.
 * `code` sets typed text (a room or friend code) in the spaced code font; the placeholder keeps the
 * body font, because the code font has no Hebrew letters and would spread them apart.
 */
export function TextField({ style, code = false, ...inputProps }: TextInputProps & { code?: boolean }) {
  const typedCode = code && Boolean(inputProps.value);
  return <TextInput placeholderTextColor={palette.text.muted} maxFontSizeMultiplier={MAX_FONT_SCALE} {...inputProps} style={[styles.input, typedCode && styles.code, style]} />;
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    minHeight: MIN_TOUCH_TARGET + space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: palette.line.strong,
    backgroundColor: palette.bg.base,
    color: palette.text.primary,
    textAlign: I18nManager.isRTL ? "right" : "left",
  },
  code: { ...typography.code, letterSpacing: 2 },
});
