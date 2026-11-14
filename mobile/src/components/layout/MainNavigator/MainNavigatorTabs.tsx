import { useEffect } from "react";
import { getFocusedRouteNameFromRoute, useNavigation, useRoute } from "@react-navigation/native";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "@/components/home/HomeScreen/HomeScreen";
import { SkillMapScreen } from "@/components/learn/SkillMapScreen/SkillMapScreen";
import { InviteBanner } from "@/components/play/InviteBanner";
import { PlayTab } from "@/components/play/PlayTab";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import type { RootNavigation } from "@/types/rootNavigation.types";
import type { MainTabParamList } from "@/types/mainTab.types";
import { TabBar } from "./TabBar";

const Tabs = createBottomTabNavigator<MainTabParamList>();

// Tabs are peers: switching never animates (PRD 12.7).
const TABS_OPTIONS = { headerShown: false as const, animation: "none" as const };
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

/** Screens a game never pulls the learner out of. */
const KEEP_IN_FRONT = new Set(["LessonPlayer", "LessonSummary"]);

export function MainTabs() {
  const navigation = useNavigation<RootNavigation>();
  const focusedTab = getFocusedRouteNameFromRoute(useRoute()) ?? "Home";
  const matchId = useAppSelector((state) => state.play.match?.matchId);
  // A game that starts, or resumes after the app was closed, opens the Play tab (PRD 11.8).
  useEffect(() => {
    const front = navigation.getState()?.routes.at(-1)?.name ?? "";
    if (matchId && !KEEP_IN_FRONT.has(front)) navigation.navigate("MainTabs", { screen: "PlayTab" });
  }, [matchId, navigation]);
  return (
    <>
      <Tabs.Navigator screenOptions={TABS_OPTIONS} tabBar={renderTabBar}>
        <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("tabs.home") }} />
        <Tabs.Screen name="LearnTab" component={SkillMapScreen} options={{ tabBarLabel: t("tabs.learn") }} />
        <Tabs.Screen name="PlayTab" component={PlayTab} options={{ tabBarLabel: t("tabs.play") }} />
        <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("tabs.profile") }} />
      </Tabs.Navigator>
      {/* The Play tab lists invitations itself. */}
      {focusedTab !== "PlayTab" ? <InviteBanner /> : null}
    </>
  );
}
