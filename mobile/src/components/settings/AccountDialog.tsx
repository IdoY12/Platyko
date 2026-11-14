import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { MAX_FONT_SCALE, MIN_TOUCH_TARGET, palette, radii, SCREEN_MARGIN, space, typography, wash } from "@/theme/tokens";

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

/** A text field in the dialog's style; what is typed is user data, so it follows the device direction. */
export function DialogInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={palette.text.muted} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={styles.input} />;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: SCREEN_MARGIN, backgroundColor: wash.scrim },
  card: { gap: space.lg },
  actions: { flexDirection: "row", gap: space.md },
  action: { flex: 1 },
  input: {
    ...typography.body,
    minHeight: MIN_TOUCH_TARGET + space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: palette.line.strong,
    backgroundColor: palette.bg.base,
    color: palette.text.primary,
  },
});
