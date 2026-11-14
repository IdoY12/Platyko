import { Image, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { palette, wash } from "@/theme/tokens";

const SIZE = 72;

/** The learner's photo, or the first letter of their name on the bill orange. */
export function ProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={styles.frame} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.frame, styles.initialFrame]}>
      <AppText variant="screenTitle" color={palette.brand.primary}>
        {name.trim().charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, borderColor: palette.brand.primary },
  initialFrame: { alignItems: "center", justifyContent: "center", backgroundColor: wash.primary },
});
