import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthScreen } from "@/components/auth/auth-screen/AuthScreen";
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
// gestureEnabled false: a mid-OTP swipe-dismiss would silently abandon verification;
// leaving is only via the explicit header back (returns to the Auth form).
const VERIFY_EMAIL_SCREEN_OPTIONS = { ...AUTH_SCREEN_OPTIONS, title: "Verify email", gestureEnabled: false };

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
        </>
      )}
    </RootStack.Navigator>
  );
}
