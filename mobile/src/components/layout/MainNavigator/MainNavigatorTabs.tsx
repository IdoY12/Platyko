import React from "react";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppSelector } from "@/redux/hooks";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { HomeScreen } from "@/components/home/HomeScreen/HomeScreen";
import { CodePuzzleScreen } from "@/components/code-puzzle/CodePuzzleScreen/CodePuzzleScreen";
import { LearnNavigator } from "@/components/layout/LearnNavigator/LearnNavigator";
import { DuelNavigator } from "@/components/layout/DuelNavigator/DuelNavigator";
import { TabBarCyber } from "./TabBarCyber";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { colors } from "@/theme/theme";
import type { HomeStackParamList } from "@/types/homeNavigation.types";
import type { MainTabParamList } from "@/types/mainTab.types";
import { guardDuelAccess } from "@/utils/formatHelpers";

const Tabs = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

type TabIconProps = { color: string; size: number };

const HOME_STACK_OPTIONS = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  contentStyle: { backgroundColor: colors.background },
};
const HOME_MAIN_OPTS = { headerShown: false as const, title: "Home" };
const CODE_PUZZLE_OPTS = { title: "Code Puzzle" };

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={HOME_STACK_OPTIONS}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={HOME_MAIN_OPTS} />
      <HomeStack.Screen name="CodePuzzle" component={CodePuzzleScreen} options={CODE_PUZZLE_OPTS} />
    </HomeStack.Navigator>
  );
}

const TABS_OPTIONS = { headerShown: false as const };
const renderTabBarCyber = (props: BottomTabBarProps) => <TabBarCyber {...props} />;
const homeIcon = ({ color, size }: TabIconProps) => <AppIcon name="home" color={color} size={size} />;
const learnIcon = ({ color, size }: TabIconProps) => <AppIcon name="book-open-variant" color={color} size={size} />;
const duelIcon = ({ color, size }: TabIconProps) => <AppIcon name="sword-cross" color={color} size={size} />;
const profileIcon = ({ color, size }: TabIconProps) => <AppIcon name="account" color={color} size={size} />;
const HOME_TAB_OPTS = { tabBarIcon: homeIcon, tabBarLabel: "Home" };
const LEARN_TAB_OPTS = { tabBarIcon: learnIcon, tabBarLabel: "Learn" };
const DUEL_TAB_OPTS = { tabBarIcon: duelIcon, tabBarLabel: "Duel" };
const PROFILE_TAB_OPTS = { tabBarIcon: profileIcon, tabBarLabel: "Profile" };

export function MainTabs() {
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const duelListeners = React.useCallback(
    ({ navigation }: { navigation: { getParent: () => { navigate: (r: never) => void } | undefined } }) => ({
      tabPress: (e: { preventDefault: () => void }) => {
        guardDuelAccess(isGuest, () => navigation.getParent()?.navigate("Auth" as never), () => {});
        if (isGuest) e.preventDefault();
      },
    }),
    [isGuest],
  );
  return (
    <Tabs.Navigator screenOptions={TABS_OPTIONS} tabBar={renderTabBarCyber}>
      <Tabs.Screen name="Home" component={HomeNavigator} options={HOME_TAB_OPTS} />
      <Tabs.Screen name="LearnTab" component={LearnNavigator} options={LEARN_TAB_OPTS} />
      <Tabs.Screen name="DuelTab" component={DuelNavigator} options={DUEL_TAB_OPTS} listeners={duelListeners} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={PROFILE_TAB_OPTS} />
    </Tabs.Navigator>
  );
}
