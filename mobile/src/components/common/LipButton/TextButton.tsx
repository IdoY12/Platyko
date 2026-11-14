import { StyleSheet } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { MIN_TOUCH_TARGET, palette } from "@/theme/tokens";

type Props = { label: string; onPress: () => void; disabled?: boolean };

/** The quietest action: a line of orange text with a full-size touch target. */
export function TextButton({ label, onPress, disabled = false }: Props) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.button}>
      <AppText variant="bodyStrong" align="center" color={disabled ? palette.text.muted : palette.brand.primary}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" },
});
