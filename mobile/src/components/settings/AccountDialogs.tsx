import type { AccountSettings } from "@/hooks/useAccountSettings";
import { DELETE_CONFIRMATION_WORD } from "@/hooks/useProfileAccountHandlers";
import { t } from "@/i18n/translate";
import { AccountDialog, DialogInput } from "./AccountDialog";

/** The username, password and delete-account dialogs; at most one is open at a time. */
export function AccountDialogs({ account }: { account: AccountSettings }) {
  const busy = account.busyAction !== null;
  if (account.usernameModalVisible) {
    return (
      <AccountDialog title={t("settings.editUsername")} confirmLabel={account.busyAction === "username" ? t("settings.saving") : t("common.save")} confirmDisabled={busy} onConfirm={() => void account.onSaveUsername()} onClose={() => account.setUsernameModalVisible(false)}>
        <DialogInput value={account.draftUsername} onChangeText={account.setDraftUsername} autoCapitalize="none" autoCorrect={false} placeholder={t("settings.usernamePlaceholder")} accessibilityLabel={t("settings.usernamePlaceholder")} />
      </AccountDialog>
    );
  }
  if (account.passwordModalVisible) {
    return (
      <AccountDialog title={t("settings.changePassword")} confirmLabel={account.busyAction === "password" ? t("settings.saving") : t("common.save")} confirmDisabled={busy} onConfirm={() => void account.onChangePassword()} onClose={() => account.setPasswordModalVisible(false)}>
        <DialogInput value={account.currentPassword} onChangeText={account.setCurrentPassword} secureTextEntry placeholder={t("settings.currentPassword")} accessibilityLabel={t("settings.currentPassword")} />
        <DialogInput value={account.newPassword} onChangeText={account.setNewPassword} secureTextEntry placeholder={t("settings.newPassword")} accessibilityLabel={t("settings.newPassword")} />
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
        <DialogInput value={account.confirmDeleteText} onChangeText={account.setConfirmDeleteText} autoCapitalize="characters" autoCorrect={false} placeholder={t("settings.deletePlaceholder")} accessibilityLabel={t("settings.deletePlaceholder")} />
      </AccountDialog>
    );
  }
  return null;
}
