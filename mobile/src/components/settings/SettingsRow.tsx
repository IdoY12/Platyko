import type { ReactNode } from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Surface } from "@/components/common/Surface/Surface";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** The chevron points the way the next screen enters: right in English, left in Hebrew. */
const FORWARD_CHEVRON: IconName = I18nManager.isRTL ? "chevron-left" : "chevron-right";

/** A group of settings rows on one surface; a group of one row needs no title above it. */
export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? (
        <AppText variant="label" color={palette.text.secondary}>
          {title}
        </AppText>
      ) : null}
      <Surface style={styles.surface}>{children}</Surface>
    </View>
  );
}

type RowProps = { icon: IconName; label: string; detail?: string; danger?: boolean; onPress?: () => void; trailing?: ReactNode };

/** One setting: an icon, a label, an optional detail line, and a control or a chevron. */
export function SettingsRow({ icon, label, detail, danger = false, onPress, trailing }: RowProps) {
  const colour = danger ? palette.state.danger : palette.text.primary;
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? palette.state.danger : palette.text.secondary} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={colour}>
          {label}
        </AppText>
        {detail ? (
          <AppText variant="label" color={palette.text.muted}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {trailing ?? (onPress ? <MaterialCommunityIcons name={FORWARD_CHEVRON} size={22} color={palette.text.muted} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} style={styles.row}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  surface: { paddingVertical: space.xs, paddingHorizontal: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: MIN_TOUCH_TARGET + space.sm, paddingVertical: space.sm },
  text: { flex: 1, gap: 2 },
});
