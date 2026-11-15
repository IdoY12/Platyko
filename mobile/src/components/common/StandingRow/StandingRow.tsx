import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { palette, radii, space, wash } from "@/theme/tokens";

type Props = {
  place: number;
  name: string;
  avatarUrl: string | null;
  /** The number the list is ranked by: a game's points, a league week's XP. */
  value: number;
  accessibilityLabel: string;
  isSelf?: boolean;
  dimmed?: boolean;
  /** A line under the name (e.g. "left the game"). */
  note?: string;
  /** Shown before the value (e.g. this round's points). */
  extra?: ReactNode;
};

/** One row of a ranking (a game's standings, a league group): place, photo, name and value; the learner's own row is lit. */
export function StandingRow({ place, name, avatarUrl, value, accessibilityLabel, isSelf = false, dimmed = false, note, extra }: Props) {
  return (
    <View style={[styles.row, isSelf && styles.self, dimmed && styles.dimmed]} accessible accessibilityLabel={accessibilityLabel}>
      <AppText variant="number" color={palette.text.muted} style={styles.place}>
        {place}
      </AppText>
      <ProfileAvatar name={name} avatarUrl={avatarUrl} size={32} />
      <View style={styles.name}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {name}
        </AppText>
        {note ? (
          <AppText variant="label" color={palette.text.muted}>
            {note}
          </AppText>
        ) : null}
      </View>
      {extra}
      <AppText variant="number" color={palette.brand.js}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radii.button, backgroundColor: palette.bg.surface },
  self: { backgroundColor: wash.primary },
  dimmed: { opacity: 0.5 },
  place: { minWidth: 20, textAlign: "center" },
  name: { flex: 1 },
});
