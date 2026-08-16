import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList } from "./mainTab.types";

/**
 * Root stack param list.
 *
 * NAVIGATION CONVENTION (applies to every screen in the app):
 * 1. Navigation is a function of auth state: `Auth` / `VerifyEmail` are registered
 *    only while unauthenticated (see MainNavigator), so they can never sit under an
 *    authenticated screen.
 * 2. Any identity change (guest -> user, user -> guest) remounts the whole
 *    NavigationContainer via its `key` (see AppNavigator), wiping every stack.
 *    Therefore auth success / sign-out handlers MUST NOT navigate — dispatching the
 *    Redux auth change is the navigation.
 * 3. Multi-step flows advance with `replace`, and exit with `popToTop` — never a
 *    chain of pushes (see Learn and Duel stacks).
 */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Auth: undefined;
  VerifyEmail: { email: string; codeJustSent: boolean };
  ForgotPassword: { email?: string };
  ResetPassword: { email: string };
};

export type ForgotPasswordNavigation = NativeStackNavigationProp<RootStackParamList, "ForgotPassword">;
export type ResetPasswordNavigation = NativeStackNavigationProp<RootStackParamList, "ResetPassword">;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
