import { useIsFocused } from "@react-navigation/native";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { palette, SCREEN_MARGIN, space } from "@/theme/tokens";
import { AmbientRiver } from "./AmbientRiver";

type Props = {
  children: ReactNode;
  /** Open screens (Home, onboarding, summaries, Play) sit on the moving river; task screens stay still. */
  ambient?: boolean;
  scrollable?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

const DEFAULT_EDGES: Edge[] = ["top", "left", "right"];

/** The frame of every screen: the navy background, safe areas and the 20-point side margins. */
export function Screen({ children, ambient = false, scrollable = false, edges = DEFAULT_EDGES, contentStyle }: Props) {
  const focused = useIsFocused();
  return (
    <View style={styles.root}>
      {ambient ? <AmbientRiver active={focused} /> : null}
      <SafeAreaView style={styles.fill} edges={edges}>
        {scrollable ? (
          <ScrollView contentContainerStyle={[styles.content, styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.content, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg.base },
  fill: { flex: 1 },
  content: { paddingHorizontal: SCREEN_MARGIN },
  scrollContent: { paddingBottom: space.xxxl, gap: space.lg },
});
