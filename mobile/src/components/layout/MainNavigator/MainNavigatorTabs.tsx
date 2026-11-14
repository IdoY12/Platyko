import React from "react";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAppSelector } from "@/redux/hooks";
import { HomeScreen } from "@/components/home/HomeScreen/HomeScreen";
import { SkillMapScreen } from "@/components/learn/SkillMapScreen/SkillMapScreen";
import { DuelNavigator } from "@/components/layout/DuelNavigator/DuelNavigator";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { t } from "@/i18n/translate";
import type { MainTabParamList } from "@/types/mainTab.types";
import { guardDuelAccess } from "@/utils/formatHelpers";
import { TabBar } from "./TabBar";

const Tabs = createBottomTabNavigator<MainTabParamList>();

// Tabs are peers: switching never animates (PRD 12.7).
const TABS_OPTIONS = { headerShown: false as const, animation: "none" as const };
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

export function MainTabs() {
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const duelListeners = React.useCallback(
    ({ navigation }: { navigation: { navigate: (route: "Auth") => void } }) => ({
      tabPress: (e: { preventDefault: () => void }) => {
        guardDuelAccess(isGuest, () => navigation.navigate("Auth"), () => {});
        if (isGuest) e.preventDefault();
      },
    }),
    [isGuest],
  );
  return (
    <Tabs.Navigator screenOptions={TABS_OPTIONS} tabBar={renderTabBar}>
      <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("tabs.home") }} />
      <Tabs.Screen name="LearnTab" component={SkillMapScreen} options={{ tabBarLabel: t("tabs.learn") }} />
      <Tabs.Screen name="DuelTab" component={DuelNavigator} options={{ tabBarLabel: t("tabs.play") }} listeners={duelListeners} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("tabs.profile") }} />
    </Tabs.Navigator>
  );
}
