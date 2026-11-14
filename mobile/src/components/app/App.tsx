import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";
import store from "@/redux/store";
import { AppShell } from "@/components/layout/AppShell/AppShell";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { useAppStartup } from "./useAppStartup";

export function App() {
  const ready = useAppStartup();
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppErrorBoundary>
        <Provider store={store}>
          <AppShell />
        </Provider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
