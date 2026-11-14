import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthScreen } from "@/components/auth/auth-screen/AuthScreen";
import { ForgotPasswordScreen } from "@/components/auth/forgot-password/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/components/auth/reset-password/ResetPasswordScreen";
import { VerifyEmailScreen } from "@/components/auth/verify-email/VerifyEmailScreen";
import { LessonPlayerScreen } from "@/components/lesson/LessonPlayerScreen";
import { LessonSummaryScreen } from "@/components/lesson/LessonSummaryScreen";
import { RevisionSetupScreen } from "@/components/learn/revision/RevisionSetupScreen";
import { AchievementsScreen } from "@/components/profile/achievements/AchievementsScreen";
import { FriendsScreen } from "@/components/social/FriendsScreen";
import { UserProfileScreen } from "@/components/social/UserProfileScreen";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { useAppSelector } from "@/redux/hooks";
import type { MessageKey } from "@project/locales";
import { t } from "@/i18n/translate";
import { palette } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/rootNavigation.types";
import { MainTabs } from "./MainNavigatorTabs";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const ROOT_STACK_OPTIONS = { headerShown: false };
// A lesson takes the whole screen: no tab bar, and a swipe cannot dismiss it half-way by accident.
const LESSON_OPTIONS = { presentation: "fullScreenModal" as const, gestureEnabled: false };
/**
 * Auth screens are modals with a native header. The header titles are read when the screen
 * renders (not when this module loads), so they follow the language applied at startup. Every
 * auth sub-screen stays escapable via the dismiss gesture (a plain pop back to the Auth form).
 * Stacked modals on iOS never draw a native header back button, so each screen also renders its
 * own explicit exit. Abandoning verification is harmless: signing in with an unverified account
 * re-enters VerifyEmail with resend available.
 */
function authScreenOptions(title: MessageKey, headerBackVisible = false) {
  return () => ({
    presentation: "modal" as const,
    headerShown: true,
    headerStyle: { backgroundColor: palette.bg.base },
    headerTintColor: palette.text.primary,
    headerShadowVisible: false,
    headerBackVisible,
    title: t(title),
  });
}

/**
 * Root stack. Auth screens are registered only while unauthenticated — on sign-in
 * React Navigation removes them from the stack automatically, and AppNavigator's
 * container `key` additionally remounts everything on any identity change.
 * See the convention in types/rootNavigation.types.ts.
 */
export function MainNavigator() {
  const isAuthenticated = useAppSelector((s) => s.session.isAuthenticated);
  return (
    <RootStack.Navigator screenOptions={ROOT_STACK_OPTIONS}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="LessonPlayer" component={LessonPlayerScreen} options={LESSON_OPTIONS} />
      <RootStack.Screen name="LessonSummary" component={LessonSummaryScreen} options={LESSON_OPTIONS} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="RevisionSetup" component={RevisionSetupScreen} />
      <RootStack.Screen name="Achievements" component={AchievementsScreen} />
      <RootStack.Screen name="Friends" component={FriendsScreen} />
      <RootStack.Screen name="UserProfile" component={UserProfileScreen} />
      {!isAuthenticated && (
        <>
          <RootStack.Screen name="Auth" component={AuthScreen} options={authScreenOptions("settings.account")} />
          <RootStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={authScreenOptions("auth.verify")} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={authScreenOptions("auth.forgotPassword", true)} />
          <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={authScreenOptions("auth.resetTitle", true)} />
        </>
      )}
    </RootStack.Navigator>
  );
}
