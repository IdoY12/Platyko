import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/theme";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { styles } from "./AuthCredentials.styles";

type Props = {
  isLogin: boolean;
  email: string;
  setEmail: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  secure: boolean;
  setSecure: Dispatch<SetStateAction<boolean>>;
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
  passwordHint: string | null;
  onSubmit: () => void;
};

export function AuthCredentials(p: Props) {
  const title = p.isLogin ? "Welcome back. Sign in to continue." : "Save your progress. Create a free account.";
  const a11y = p.isLogin ? "Sign in" : "Create account";
  const label = p.isLogin ? "Sign In" : "Create Account";
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <TextInput
        value={p.email}
        onChangeText={p.setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email input"
      />
      {p.isLogin ? null : (
        <TextInput
          value={p.username}
          onChangeText={p.setUsername}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          accessibilityLabel="Username input"
        />
      )}
      <View style={styles.passwordRow}>
        <TextInput
          value={p.password}
          onChangeText={p.setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.passwordInput]}
          secureTextEntry={p.secure}
          accessibilityLabel="Password input"
        />
        <Pressable onPress={() => p.setSecure((v) => !v)} style={styles.showHide}>
          <Text style={styles.showHideText}>{p.secure ? "Show" : "Hide"}</Text>
        </Pressable>
      </View>
      {p.passwordHint ? <Text style={styles.errorText}>{p.passwordHint}</Text> : null}
      <PressableScale
        disabled={!p.canSubmit}
        style={[styles.primaryButton, !p.canSubmit && styles.disabled]}
        haptic="medium"
        onPress={p.onSubmit}
        accessibilityLabel={a11y}
      >
        <Text style={styles.primaryLabel}>{p.loading ? "Please wait..." : label}</Text>
      </PressableScale>
      {p.error ? <Text style={styles.errorText}>{p.error}</Text> : null}
    </>
  );
}
