import { NavigationContext } from "@react-navigation/native";
import { useContext, useEffect, useState, type ReactNode } from "react";
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

/** Whether the screen is in front; true outside a navigator (onboarding runs before it mounts). */
function useScreenInFront(): boolean {
  const navigation = useContext(NavigationContext);
  const [inFront, setInFront] = useState(navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    const stopFocus = navigation.addListener("focus", () => setInFront(true));
    const stopBlur = navigation.addListener("blur", () => setInFront(false));
    return () => {
      stopFocus();
      stopBlur();
    };
  }, [navigation]);
  return inFront;
}

/** The frame of every screen: the navy background, safe areas and the 20-point side margins. */
export function Screen({ children, ambient = false, scrollable = false, edges = DEFAULT_EDGES, contentStyle }: Props) {
  const focused = useScreenInFront();
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
  // Room for the floating tab bar, so the last card can scroll fully into view.
  scrollContent: { paddingBottom: 140, gap: space.lg },
});
