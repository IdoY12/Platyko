import { StyleSheet } from "react-native";
import { t } from "@/i18n/translate";
import { typography } from "@/theme/tokens";
import { TextField } from "./TextField";

/** The six-digit code from an email: digits only, filled from the iOS keyboard suggestion. */
export function CodeField({ value, onChangeText }: { value: string; onChangeText: (code: string) => void }) {
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      maxLength={6}
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      placeholder={t("auth.code")}
      accessibilityLabel={t("auth.code")}
      style={styles.code}
    />
  );
}

const styles = StyleSheet.create({
  code: { ...typography.code, fontSize: 22, letterSpacing: 8, textAlign: "center" },
});
