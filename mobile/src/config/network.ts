import Constants from "expo-constants";

const DEV_BACKEND_PORT = "4000";
const DEV_IO_PORT = "4001";
const PROD_API_BASE_URL = "https://api.platyko.com/api";
const PROD_DUEL_SOCKET_URL = "https://io.platyko.com/duel";

function getExpoHost(): string | null {
  const hostUri =
    // Primary: new Expo API — populated only when running via Expo Go (QR scan) or Dev Client
    // Returns e.g. "192.168.1.88:8081" (host:metroPort), undefined in native builds
    Constants.expoConfig?.hostUri ??

    // Fallback: legacy Expo Go API (removed from official types but still present at runtime on older versions)
    // Cast needed because TypeScript no longer includes expoGoConfig in the Constants type definitions
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost ??

    // Fallback: LAN IP written to mobile/.env by ios-device.sh before native build.
    // React Native types process.env values as `any`, so pin the real type here.
    (process.env.EXPO_PUBLIC_DEV_HOST as string | undefined) ??
    // No host available — native build without ios-device.sh, caller handles this
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
