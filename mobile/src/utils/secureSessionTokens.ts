import type { AppDispatch } from "@/redux/store";
import { setBootstrapError, updateTokens } from "@/redux/session-slice";
import { logError } from "@/utils/logger";
import * as SecureStore from "expo-secure-store";
import {
  SECURE_STORAGE_ACCESS_TOKEN_KEY,
  SECURE_STORAGE_REFRESH_TOKEN_KEY,
} from "@/constants/secureStorageKeyConstants";

/**
 * Saves or deletes tokens in the device's hardware-encrypted storage.
 */
export async function writeSecureSessionTokens(
  accessToken: string | null,
  refreshToken: string | null,
): Promise<void> {
  // If an accessToken exists, save it. Otherwise, attempt to delete it.
  if (accessToken) {
    await SecureStore.setItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY, accessToken);
  } else {
    // We use .catch() to ignore errors if the key was already missing.
    await SecureStore.deleteItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY).catch(() => undefined);
  }

  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY, refreshToken);
  } else {
    await SecureStore.deleteItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY).catch(() => undefined);
  }
}

/**
 * Fetches tokens from the secure vault. Throws if SecureStore is unavailable.
 */
export async function readSecureSessionTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function clearSecureSessionTokens(): Promise<void> {
  await writeSecureSessionTokens(null, null);
}

/** Retry path after a failed launch-time keychain read: read again; undefined means "still unreadable". */
export async function readTokensAgain(dispatch: AppDispatch): Promise<string | null | undefined> {
  try {
    const { accessToken, refreshToken } = await readSecureSessionTokens();
    if (accessToken && refreshToken) dispatch(updateTokens({ accessToken, refreshToken }));
    return accessToken;
  } catch (error) {
    logError("[AUTH]", error, { phase: "bootstrap-keychain" });
    dispatch(setBootstrapError("Could not access your stored credentials. Tap Retry to try again."));
    return undefined;
  }
}
