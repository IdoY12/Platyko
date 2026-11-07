import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNavigator } from "@/components/layout/AppNavigator/AppNavigator";
import { spacing } from "@/theme/theme";
import { styles } from "./AppShell.styles";
import { useAppShell } from "@/hooks/useAppShell";

/** Estimated offline banner height, used to stack the bootstrap banner below it. */
const OFFLINE_BANNER_STACK_OFFSET = 68;

type BannerProps = { isConnected: boolean; bootstrapError: string | null; retryBootstrap: () => void; dismissBootstrapError: () => void };

function AppShellBanners({ isConnected, bootstrapError, retryBootstrap, dismissBootstrapError }: BannerProps) {
  const insets = useSafeAreaInsets();
  const bannerTop = insets.top + spacing.sm;
  return (
    <>
      {!isConnected && (
        <View style={[styles.offlineBanner, { top: bannerTop }]}>
          <Text style={styles.offlineText}>You are offline. Your progress is saved on this device.</Text>
        </View>
      )}
      {bootstrapError ? (
        <View style={[styles.bootstrapBanner, { top: bannerTop + (!isConnected ? OFFLINE_BANNER_STACK_OFFSET : 0) }]}>
          <Text style={styles.bootstrapText}>{bootstrapError}</Text>
          <View style={styles.bootstrapActions}>
            <PressableScale onPress={retryBootstrap} style={styles.bootstrapRetry} haptic="light" accessibilityLabel="Retry loading account">
              <Text style={styles.bootstrapRetryLabel}>Retry</Text>
            </PressableScale>
            {/* The banner floats over screen headers; dismissing it frees the back arrow underneath. */}
            <PressableScale onPress={dismissBootstrapError} style={styles.bootstrapDismiss} haptic="light" accessibilityLabel="Dismiss server message">
              <Text style={styles.bootstrapDismissLabel}>Dismiss</Text>
            </PressableScale>
          </View>
        </View>
      ) : null}
    </>
  );
}

export function AppShell() {
  // Boots error handling, notifications and the stored session, and tracks connectivity for the offline banner.
  const { isConnected, bootstrapError, retryBootstrap, dismissBootstrapError } = useAppShell();

  return (
    // react-native-safe-area-context: exposes notch / status bar / home-indicator insets to descendants (e.g. useSafeAreaInsets). Must wrap the app near the root.
    <SafeAreaProvider>
      <View style={styles.container}>
        <AppShellBanners isConnected={isConnected} bootstrapError={bootstrapError} retryBootstrap={retryBootstrap} dismissBootstrapError={dismissBootstrapError} />
        <AppNavigator />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}
