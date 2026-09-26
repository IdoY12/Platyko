import { Provider } from "react-redux";
import store from "@/redux/store";
import { AppShell } from "@/components/layout/AppShell/AppShell";
import { AppErrorBoundary } from "./AppErrorBoundary";

export function App() {
  return (
    <AppErrorBoundary>
      <Provider store={store}>
        <AppShell />
      </Provider>
    </AppErrorBoundary>
  );
}
