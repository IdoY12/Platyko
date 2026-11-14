import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/common/AppText/AppText";
import { haptic } from "@/theme/haptics";
import { LIP_HEIGHT, MIN_TOUCH_TARGET, palette, radii, space, transitions } from "@/theme/tokens";

type Tone = "primary" | "success" | "danger" | "quiet";

type Props = {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const TONES: Record<Tone, { face: string; lip: string; text: string }> = {
  primary: { face: palette.brand.primary, lip: palette.brand.primaryDeep, text: palette.text.onBright },
  success: { face: palette.state.success, lip: palette.state.successDeep, text: palette.text.onBright },
  danger: { face: palette.state.danger, lip: palette.state.dangerDeep, text: palette.text.onBright },
  quiet: { face: palette.bg.raised, lip: palette.bg.surface, text: palette.text.primary },
};

/**
 * The app's main button. Its face sits on a darker lip and sinks into it while pressed, which
 * gives a tactile, physical feel without any 3D rendering (PRD 12.4, 12.8). It sizes to its
 * label, so long translations never overflow.
 */
export function LipButton({ label, onPress, tone = "primary", disabled = false, loading = false, style, accessibilityHint }: Props) {
  const [pressed, setPressed] = useState(false);
  const colours = TONES[tone];
  const inactive = disabled || loading;
  const sunk = pressed && !inactive;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPressIn={() => {
        setPressed(true);
        haptic.press();
      }}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      pressRetentionOffset={space.lg}
      style={[styles.frame, inactive && styles.inactive, style]}
    >
      <View style={[styles.lip, { backgroundColor: colours.lip }]} />
      <Animated.View style={[styles.face, transitions.press, { backgroundColor: colours.face, transform: [{ translateY: sunk ? LIP_HEIGHT : 0 }] }]}>
        {loading ? <ActivityIndicator color={colours.text} /> : <AppText variant="button" color={colours.text} align="center">{label}</AppText>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { minHeight: MIN_TOUCH_TARGET + LIP_HEIGHT, paddingBottom: LIP_HEIGHT },
  inactive: { opacity: 0.45 },
  lip: { position: "absolute", left: 0, right: 0, top: LIP_HEIGHT, bottom: 0, borderRadius: radii.button },
  face: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.button,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
