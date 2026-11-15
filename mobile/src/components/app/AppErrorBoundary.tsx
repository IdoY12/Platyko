import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { t } from "@/i18n/translate";
import { logError } from "@/utils/logger";
import { styles } from "./App.styles";

type State = { crashed: boolean; mountKey: number };

/**
 * Last line of defence: a render error anywhere below shows a calm full-screen message with a
 * Restart action instead of a white screen or a native crash. Restart remounts the whole tree
 * (new `key`), which re-reads persisted state exactly like a cold launch.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false, mountKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError("[APP]", error, { phase: "render", componentStack: info.componentStack });
  }

  private restart = () => this.setState((s) => ({ crashed: false, mountKey: s.mountKey + 1 }));

  render() {
    if (this.state.crashed) {
      return (
        <View style={styles.crashScreen}>
          <Text style={styles.crashTitle}>{t("app.crashTitle")}</Text>
          <Text style={styles.crashBody}>{t("app.crashBody")}</Text>
          <Pressable style={styles.crashButton} onPress={this.restart} accessibilityRole="button" accessibilityLabel={t("app.crashRestartLabel")}>
            <Text style={styles.crashButtonLabel}>{t("app.crashRestart")}</Text>
          </Pressable>
        </View>
      );
    }
    return <View key={this.state.mountKey} style={styles.root}>{this.props.children}</View>;
  }
}
