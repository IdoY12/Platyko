import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { AppNavigator } from "@/components/layout/AppNavigator/AppNavigator";
import { GuestMergePrompt } from "@/components/auth/guest-merge/GuestMergePrompt";
import { useAppShell } from "@/hooks/useAppShell";
import { t } from "@/i18n/translate";
import type { BootstrapProblem } from "@/redux/session-slice";
import { palette, SCREEN_MARGIN, space } from "@/theme/tokens";

const PROBLEM_TEXT = { server: "shell.problem.server", offline: "shell.problem.offline", keychain: "shell.problem.keychain" } as const;

type BannerProps = { isConnected: boolean; bootstrapProblem: BootstrapProblem | null; retryBootstrap: () => void; dismissBootstrapProblem: () => void };

/** The offline note and the "account did not load" notice, floating above every screen. */
function AppShellBanners({ isConnected, bootstrapProblem, retryBootstrap, dismissBootstrapProblem }: BannerProps) {
  const insets = useSafeAreaInsets();
  if (isConnected && !bootstrapProblem) return null;
  return (
    <View style={[styles.banners, { top: insets.top + space.sm }]} pointerEvents="box-none">
      {!isConnected ? (
        <Surface level="raised" style={[styles.banner, styles.offline]} accessibilityLiveRegion="polite">
          <AppText variant="label">{t("shell.offline")}</AppText>
        </Surface>
      ) : null}
      {bootstrapProblem ? (
        <Surface level="raised" style={[styles.banner, styles.problem]} accessibilityLiveRegion="polite">
          <AppText variant="label">{t(PROBLEM_TEXT[bootstrapProblem])}</AppText>
          <View style={styles.actions}>
            <LipButton label={t("common.retry")} onPress={retryBootstrap} style={styles.action} />
            {/* The banner floats over screen headers; closing it frees the back arrow underneath. */}
            <OutlineButton label={t("common.close")} onPress={dismissBootstrapProblem} style={styles.action} />
          </View>
        </Surface>
      ) : null}
    </View>
  );
}

export function AppShell() {
  // Boots error handling, notifications and the stored session, and tracks connectivity for the offline banner.
  const { isConnected, bootstrapProblem, retryBootstrap, dismissBootstrapProblem } = useAppShell();
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <AppNavigator />
        <AppShellBanners isConnected={isConnected} bootstrapProblem={bootstrapProblem} retryBootstrap={retryBootstrap} dismissBootstrapProblem={dismissBootstrapProblem} />
        <GuestMergePrompt />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg.base },
  banners: { position: "absolute", left: SCREEN_MARGIN, right: SCREEN_MARGIN, gap: space.sm, zIndex: 50 },
  banner: { gap: space.md, padding: space.lg, borderWidth: 1 },
  offline: { borderColor: palette.brand.js },
  problem: { borderColor: palette.state.danger },
  actions: { flexDirection: "row", gap: space.md },
  action: { flex: 1 },
});
