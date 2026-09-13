import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthScreen } from "@/components/auth/auth-screen/AuthScreen";
import { ForgotPasswordScreen } from "@/components/auth/forgot-password/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/components/auth/reset-password/ResetPasswordScreen";
import { VerifyEmailScreen } from "@/components/auth/verify-email/VerifyEmailScreen";
import { useAppSelector } from "@/redux/hooks";
import { colors } from "@/theme/theme";
import type { RootStackParamList } from "@/types/rootNavigation.types";
import { MainTabs } from "./MainNavigatorTabs";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const ROOT_STACK_OPTIONS = { headerShown: false };
const AUTH_SCREEN_OPTIONS = {
  presentation: "modal" as const,
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  title: "Sign in",
};
// Every auth sub-screen stays escapable via the dismiss gesture (a plain pop back to the
// Auth form). Stacked modals on iOS never draw a native header back button, so each screen
// also renders its own explicit exit. Abandoning verification is harmless: signing in with
// an unverified account re-enters VerifyEmail with resend available.
const VERIFY_EMAIL_SCREEN_OPTIONS = { ...AUTH_SCREEN_OPTIONS, title: "Verify email" };
const FORGOT_PASSWORD_SCREEN_OPTIONS = { ...AUTH_SCREEN_OPTIONS, title: "Forgot password", headerBackVisible: true };
const RESET_PASSWORD_SCREEN_OPTIONS = { ...AUTH_SCREEN_OPTIONS, title: "Reset password", headerBackVisible: true };

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
      {!isAuthenticated && (
        <>
          <RootStack.Screen name="Auth" component={AuthScreen} options={AUTH_SCREEN_OPTIONS} />
          <RootStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={VERIFY_EMAIL_SCREEN_OPTIONS} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={FORGOT_PASSWORD_SCREEN_OPTIONS} />
          <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={RESET_PASSWORD_SCREEN_OPTIONS} />
        </>
      )}
    </RootStack.Navigator>
  );
}
