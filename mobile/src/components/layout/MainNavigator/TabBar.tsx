import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { haptic } from "@/theme/haptics";
import { MIN_TOUCH_TARGET, palette, radii, space } from "@/theme/tokens";

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Icon per tab route; the label comes from the route's options. */
const TAB_ICONS: Record<string, { idle: TabIconName; active: TabIconName }> = {
  Home: { idle: "home-variant-outline", active: "home-variant" },
  LearnTab: { idle: "map-outline", active: "map" },
  DuelTab: { idle: "sword-cross", active: "sword-cross" },
  Profile: { idle: "account-circle-outline", active: "account-circle" },
};

/**
 * The tab bar: a floating raised strip on the water. Tabs are peers, so switching never slides
 * (PRD 12.7); the active tab is shown by colour, a filled icon and a small pill, not by motion.
 * It follows the layout direction, so in Hebrew the tab order is mirrored.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = String(descriptors[route.key].options.tabBarLabel ?? route.name);
          const icons = TAB_ICONS[route.name] ?? { idle: "circle-outline", active: "circle" };
          const colour = focused ? palette.brand.primary : palette.text.muted;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptic.selection();
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tab}
            >
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <MaterialCommunityIcons name={focused ? icons.active : icons.idle} size={24} color={colour} />
              </View>
              <AppText variant="label" color={colour} numberOfLines={1}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg },
  bar: {
    flexDirection: "row",
    borderRadius: radii.card,
    backgroundColor: "rgba(27,30,85,0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line.strong,
    paddingVertical: space.sm,
    shadowColor: palette.bg.deep,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  tab: { flex: 1, minHeight: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center", gap: 2 },
  iconPill: { paddingHorizontal: space.lg, paddingVertical: 2, borderRadius: radii.pill },
  iconPillActive: { backgroundColor: "rgba(255,138,61,0.16)" },
});
