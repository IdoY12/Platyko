import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { Screen } from "@/components/common/Screen/Screen";
import { palette, space } from "@/theme/tokens";

/** The frame of every sign-in step: a title, a line of explanation, then the form. */
export function AuthLayout({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <Screen scrollable edges={["left", "right", "bottom"]} contentStyle={styles.content}>
      <AppText variant="screenTitle" accessibilityRole="header">
        {title}
      </AppText>
      {body ? <AppText color={palette.text.secondary}>{body}</AppText> : null}
      {children}
    </Screen>
  );
}

/** A form error or a rule the input breaks, in the danger colour. */
export function AuthMessage({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <AppText variant="label" color={palette.state.danger} accessibilityLiveRegion="polite">
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.xxl, paddingBottom: space.xxl, gap: space.lg },
});
