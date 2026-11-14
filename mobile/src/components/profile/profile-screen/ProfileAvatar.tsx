import { Image, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText/AppText";
import { palette, wash } from "@/theme/tokens";

/** The learner's photo, or the first letter of their name on the bill orange. */
export function ProfileAvatar({ name, avatarUrl, size = 72 }: { name: string; avatarUrl: string | null; size?: number }) {
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={[styles.frame, frame]} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.frame, frame, styles.initialFrame]}>
      <AppText variant={size >= 64 ? "screenTitle" : "bodyStrong"} color={palette.brand.primary}>
        {name.trim().charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 2, borderColor: palette.brand.primary },
  initialFrame: { alignItems: "center", justifyContent: "center", backgroundColor: wash.primary },
});
