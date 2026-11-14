import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { palette, SCREEN_MARGIN, space, wash } from "@/theme/tokens";

type Props = {
  title: string;
  body?: string;
  children?: ReactNode;
  confirmLabel: string;
  confirmTone?: "primary" | "danger";
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  footer?: ReactNode;
};

/** A centred dialog over the dimmed river: a title, an explanation, inputs, then cancel and confirm. */
export function AccountDialog({ title, body, children, confirmLabel, confirmTone = "primary", confirmDisabled = false, onConfirm, onClose, footer }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Surface level="raised" style={styles.card} accessibilityViewIsModal>
          <AppText variant="cardTitle" accessibilityRole="header">
            {title}
          </AppText>
          {body ? <AppText color={palette.text.secondary}>{body}</AppText> : null}
          {children}
          <View style={styles.actions}>
            <OutlineButton label={t("common.cancel")} onPress={onClose} style={styles.action} />
            <LipButton label={confirmLabel} tone={confirmTone} disabled={confirmDisabled} onPress={onConfirm} style={styles.action} />
          </View>
          {footer}
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: SCREEN_MARGIN, backgroundColor: wash.scrim },
  card: { gap: space.lg },
  actions: { flexDirection: "row", gap: space.md },
  action: { flex: 1 },
});
