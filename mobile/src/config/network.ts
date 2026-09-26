import Constants from "expo-constants";
import { NativeModules } from "react-native";

const DEV_BACKEND_PORT = "4000";
const DEV_IO_PORT = "4001";
const PROD_API_BASE_URL = "https://api.platyko.com/api";
const PROD_DUEL_SOCKET_URL = "https://io.platyko.com/duel";

/** Without a timeout a request to an unreachable host hangs forever and spinners never resolve. */
export const REQUEST_TIMEOUT_MS = 10_000;
/** Avatar uploads move up to 5 MB over mobile networks. */
export const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Host the running JS bundle was fetched from (Metro), e.g. "192.168.1.221:8081".
 * Most reliable dev host: if this code is executing, that address was reachable moments ago.
 * Null when the bundle is embedded (file:// — release builds, Metro-less device builds).
 */
function getBundleSourceHost(): string | null {
  const sourceCode = (NativeModules as { SourceCode?: { getConstants?: () => { scriptURL?: string } } }).SourceCode;
  const scriptURL = sourceCode?.getConstants?.()?.scriptURL;
  if (!scriptURL?.startsWith("http")) return null;
  return scriptURL.split("://")[1]?.split("/")[0] ?? null;
}

function getExpoHost(): string | null {
  const hostUri =
    // Live Metro host ("192.168.1.221:8081") — self-heals when the Mac's LAN IP changes
    getBundleSourceHost() ??

    // Expo Go / dev-client manifest host; undefined in bare native builds
    Constants.expoConfig?.hostUri ??

    // Legacy Expo Go API (removed from official types but still present at runtime on older versions)
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost ??

    // LAN IP written to mobile/.env by ios-device.sh before a native device build.
    // Inlined at bundle time — goes stale if the Mac's IP changes after the build.
    (process.env.EXPO_PUBLIC_DEV_HOST as string | undefined) ??
    null;
  if (!hostUri) return null;
  return hostUri.split(":")[0] ?? null;
}

function getApiBaseUrl(): string {
  if (!__DEV__) return PROD_API_BASE_URL;
  const host = getExpoHost() ?? "localhost";
  return `http://${host}:${DEV_BACKEND_PORT}/api`;
}

function getDuelSocketUrl(): string {
  if (!__DEV__) return PROD_DUEL_SOCKET_URL;
  const host = getExpoHost() ?? "localhost";
  return `http://${host}:${DEV_IO_PORT}/duel`;
}

export const API_BASE_URL = getApiBaseUrl();

export const DUEL_SOCKET_URL = getDuelSocketUrl();
