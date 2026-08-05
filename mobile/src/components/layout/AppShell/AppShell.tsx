import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNavigator } from "@/components/layout/AppNavigator/AppNavigator";
import { spacing } from "@/theme/theme";
import { styles } from "./AppShell.styles";
import { appQueryClient, useAppShell } from "@/hooks/useAppShell";

/** Estimated offline banner height, used to stack the bootstrap banner below it. */
const OFFLINE_BANNER_STACK_OFFSET = 68;

function AppShellBanners({ isConnected, bootstrapError, retryBootstrap }: { isConnected: boolean; bootstrapError: string | null; retryBootstrap: () => void }) {
  const insets = useSafeAreaInsets();
  const bannerTop = insets.top + spacing.sm;
  return (
    <>
      {!isConnected && (
        <View style={[styles.offlineBanner, { top: bannerTop }]}>
          <Text style={styles.offlineText}>You are offline. Continue with cached lessons.</Text>
        </View>
      )}
      {bootstrapError ? (
        <View style={[styles.bootstrapBanner, { top: bannerTop + (!isConnected ? OFFLINE_BANNER_STACK_OFFSET : 0) }]}>
          <Text style={styles.bootstrapText}>{bootstrapError}</Text>
          <PressableScale onPress={retryBootstrap} style={styles.bootstrapRetry} haptic="light" accessibilityLabel="Retry loading account">
            <Text style={styles.bootstrapRetryLabel}>Retry</Text>
          </PressableScale>
        </View>
      ) : null}
    </>
  );
}

export function AppShell() {
  // Power on the "Control Center": Fires up startup services (Logging, Errors, Notifications)
  // and connects the User's session & profile to the app.
  // It also tracks real-time internet status for the offline banner.
  const { isConnected, bootstrapError, retryBootstrap } = useAppShell();

  return (
    // react-native-safe-area-context: exposes notch / status bar / home-indicator insets to descendants (e.g. useSafeAreaInsets). Must wrap the app near the root.
    <SafeAreaProvider>
      <QueryClientProvider client={appQueryClient}>
        <View style={styles.container}>
          <AppShellBanners isConnected={isConnected} bootstrapError={bootstrapError} retryBootstrap={retryBootstrap} />
          <AppNavigator />
          <StatusBar style="light" />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
