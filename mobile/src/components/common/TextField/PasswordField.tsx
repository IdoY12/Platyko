import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";
import { TextField } from "./TextField";

type Props = { value: string; onChangeText: (password: string) => void; placeholder: string; newPassword?: boolean };

/** A password field with an eye to show what was typed. */
export function PasswordField({ value, onChangeText, placeholder, newPassword = false }: Props) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.row}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={newPassword ? "newPassword" : "password"}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        style={styles.field}
      />
      <PressableScale onPress={() => setHidden((current) => !current)} accessibilityRole="button" accessibilityLabel={hidden ? t("auth.showPassword") : t("auth.hidePassword")} style={styles.eye}>
        <MaterialCommunityIcons name={hidden ? "eye-outline" : "eye-off-outline"} size={22} color={palette.text.secondary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: "center" },
  // Room at the end of the field for the eye button that sits over it.
  field: { paddingEnd: MIN_TOUCH_TARGET + space.xs },
  eye: { position: "absolute", end: space.xs, width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" },
});
