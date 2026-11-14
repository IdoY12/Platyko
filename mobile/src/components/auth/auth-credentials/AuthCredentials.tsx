import { LipButton } from "@/components/common/LipButton/LipButton";
import { PasswordField } from "@/components/common/TextField/PasswordField";
import { TextField } from "@/components/common/TextField/TextField";
import type { useAuthScreen } from "@/hooks/useAuthScreen";
import { localizedMessage } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import { AuthMessage } from "../auth-layout/AuthLayout";

/** Email, username (when registering) and password, then the one primary action. */
export function AuthCredentials(form: ReturnType<typeof useAuthScreen>) {
  return (
    <>
      <TextField value={form.email} onChangeText={form.setEmail} placeholder={t("auth.email")} accessibilityLabel={t("auth.email")} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" autoCapitalize="none" autoCorrect={false} />
      {form.isLogin ? null : (
        <TextField value={form.username} onChangeText={form.setUsername} placeholder={t("auth.username")} accessibilityLabel={t("auth.username")} textContentType="username" autoCapitalize="none" autoCorrect={false} />
      )}
      <PasswordField value={form.password} onChangeText={form.setPassword} placeholder={t("auth.password")} newPassword={!form.isLogin} />
      <AuthMessage text={form.formHint ? localizedMessage(form.formHint) : null} />
      <LipButton label={form.loading ? t("auth.wait") : form.isLogin ? t("auth.signIn") : t("auth.createAccount")} disabled={!form.canSubmit || form.loading} loading={form.loading} onPress={form.onSubmit} />
      <AuthMessage text={form.error} />
    </>
  );
}
