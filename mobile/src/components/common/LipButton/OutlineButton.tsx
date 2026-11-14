import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

type Props = { label: string; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; icon?: ReactNode };

/** The secondary action beside a `LipButton`: an outline with no fill (PRD 12.6). */
export function OutlineButton({ label, onPress, disabled = false, style, icon }: Props) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      {icon}
      <AppText variant="button" align="center">{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: palette.line.strong,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
});
