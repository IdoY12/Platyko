import type { AccountSettings } from "@/hooks/useAccountSettings";
import { DELETE_CONFIRMATION_WORD } from "@/hooks/useProfileAccountHandlers";
import { t } from "@/i18n/translate";
import { PasswordField } from "@/components/common/TextField/PasswordField";
import { TextField } from "@/components/common/TextField/TextField";
import { AccountDialog } from "./AccountDialog";

/** The username, password and delete-account dialogs; at most one is open at a time. */
export function AccountDialogs({ account }: { account: AccountSettings }) {
  const busy = account.busyAction !== null;
  if (account.usernameModalVisible) {
    return (
      <AccountDialog title={t("settings.editUsername")} confirmLabel={account.busyAction === "username" ? t("settings.saving") : t("common.save")} confirmDisabled={busy} onConfirm={() => void account.onSaveUsername()} onClose={() => account.setUsernameModalVisible(false)}>
        <TextField value={account.draftUsername} onChangeText={account.setDraftUsername} autoCapitalize="none" autoCorrect={false} placeholder={t("settings.usernamePlaceholder")} accessibilityLabel={t("settings.usernamePlaceholder")} />
      </AccountDialog>
    );
  }
  if (account.passwordModalVisible) {
    return (
      <AccountDialog title={t("settings.changePassword")} confirmLabel={account.busyAction === "password" ? t("settings.saving") : t("common.save")} confirmDisabled={busy} onConfirm={() => void account.onChangePassword()} onClose={() => account.setPasswordModalVisible(false)}>
        <PasswordField value={account.currentPassword} onChangeText={account.setCurrentPassword} placeholder={t("settings.currentPassword")} />
        <PasswordField value={account.newPassword} onChangeText={account.setNewPassword} placeholder={t("auth.newPassword")} newPassword />
      </AccountDialog>
    );
  }
  if (account.deleteModalVisible) {
    return (
      <AccountDialog
        title={t("settings.deleteAccount")}
        body={t("settings.deleteBody")}
        confirmLabel={account.busyAction === "delete" ? t("settings.deleting") : t("settings.deleteAccount")}
        confirmTone="danger"
        confirmDisabled={busy || account.confirmDeleteText !== DELETE_CONFIRMATION_WORD}
        onConfirm={() => void account.onDeleteAccount()}
        onClose={() => account.setDeleteModalVisible(false)}
      >
        <TextField value={account.confirmDeleteText} onChangeText={account.setConfirmDeleteText} autoCapitalize="characters" autoCorrect={false} placeholder={t("settings.deletePlaceholder")} accessibilityLabel={t("settings.deletePlaceholder")} />
      </AccountDialog>
    );
  }
  return null;
}
