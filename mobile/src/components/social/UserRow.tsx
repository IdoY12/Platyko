import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { PublicUser } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { ProfileAvatar } from "@/components/profile/profile-screen/ProfileAvatar";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, space } from "@/theme/tokens";

/** One user in a list: photo, username and level, opening the profile; `actions` sit at the end. */
export function UserRow({ user, onOpen, actions }: { user: PublicUser; onOpen: () => void; actions?: ReactNode }) {
  return (
    <View style={styles.row}>
      <PressableScale onPress={onOpen} accessibilityRole="button" accessibilityLabel={user.username} style={styles.identity}>
        <ProfileAvatar name={user.username} avatarUrl={user.avatarUrl} size={40} />
        <View style={styles.text}>
          {/* A username is user data: it reads left to right whatever the UI language. */}
          <AppText variant="bodyStrong" align="ltr" numberOfLines={1}>
            {user.username}
          </AppText>
          {user.level !== null ? (
            <AppText variant="label" color={palette.text.muted}>
              {t("profile.level")} {user.level}
            </AppText>
          ) : null}
        </View>
      </PressableScale>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: MIN_TOUCH_TARGET + space.sm },
  identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  text: { flex: 1, gap: 2 },
});
