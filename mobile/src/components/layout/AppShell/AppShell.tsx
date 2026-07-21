import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "@/components/layout/AppNavigator/AppNavigator";
import { styles } from "./AppShell.styles";
import { appQueryClient, useAppShell } from "@/hooks/useAppShell";

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
          {!isConnected && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>You are offline. Continue with cached lessons.</Text>
            </View>
          )}
          {bootstrapError ? (
            <View style={[styles.bootstrapBanner, !isConnected && { top: 120 }]}>
              <Text style={styles.bootstrapText}>{bootstrapError}</Text>
              <PressableScale onPress={retryBootstrap} style={styles.bootstrapRetry} haptic accessibilityLabel="Retry loading account">
                <Text style={styles.bootstrapRetryLabel}>Retry</Text>
              </PressableScale>
            </View>
          ) : null}
          <AppNavigator />
          <StatusBar style="light" />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
