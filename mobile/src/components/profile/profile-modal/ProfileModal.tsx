import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/theme";
import type { UseProfileScreenReturn } from "@/hooks/useProfileScreen";
import { profileSectionCardStyles } from "@/theme/profileSectionCard";
import { m } from "./ProfileModal.styles";

type Mode = "u" | "p" | "d" | null;

export function ProfileModal({ p }: { p: UseProfileScreenReturn }) {
  const mode: Mode = p.usernameModalVisible ? "u" : p.passwordModalVisible ? "p" : p.deleteModalVisible ? "d" : null;

  const close = () => {
    if (mode === "u") p.setUsernameModalVisible(false);
    else if (mode === "p") p.setPasswordModalVisible(false);
    else if (mode === "d") p.setDeleteModalVisible(false);
  };

  const delDis = p.confirmDeleteText !== "DELETE" || p.busyAction === "delete";

  return (
    <Modal visible={!!mode} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={m.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={m.card}>
          <Text style={m.title}>{mode === "u" ? "Edit Username" : mode === "p" ? "Change Password" : "Delete Account"}</Text>
          {mode === "u" ? (
            <TextInput style={m.input} value={p.draftUsername} onChangeText={p.setDraftUsername} autoCapitalize="none" placeholder="Username" placeholderTextColor={colors.textMuted} />
          ) : mode === "p" ? (
            <>
              <TextInput style={m.input} value={p.currentPassword} onChangeText={p.setCurrentPassword} secureTextEntry placeholder="Current password" placeholderTextColor={colors.textMuted} />
              <TextInput style={m.input} value={p.newPassword} onChangeText={p.setNewPassword} secureTextEntry placeholder="New password" placeholderTextColor={colors.textMuted} />
            </>
          ) : mode === "d" ? (
            <>
              <Text style={m.bodyText}>This action is permanent and cannot be undone. Type DELETE to confirm account deletion.</Text>
              <TextInput style={m.input} value={p.confirmDeleteText} onChangeText={p.setConfirmDeleteText} autoCapitalize="characters" placeholder="Type DELETE" placeholderTextColor={colors.textMuted} />
            </>
          ) : null}
          <View style={m.actions}>
            <Pressable style={m.ghost} onPress={close}>
              <Text style={m.ghostTxt}>Cancel</Text>
            </Pressable>
            {mode === "u" ? (
              <Pressable style={m.primary} onPress={() => void p.onSaveUsername()}>
                <Text style={m.primaryTxt}>{p.busyAction === "username" ? "Saving..." : "Save"}</Text>
              </Pressable>
            ) : mode === "p" ? (
              <Pressable style={m.primary} onPress={() => void p.onChangePassword()}>
                <Text style={m.primaryTxt}>{p.busyAction === "password" ? "Updating..." : "Update"}</Text>
              </Pressable>
            ) : mode === "d" ? (
              <Pressable style={[m.danger, delDis && profileSectionCardStyles.saveButtonDisabled]} disabled={delDis} onPress={() => void p.onDeleteAccount()}>
                <Text style={m.dangerTxt}>{p.busyAction === "delete" ? "Deleting..." : "Delete"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
