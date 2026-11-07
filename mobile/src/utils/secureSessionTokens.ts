import store, { type AppDispatch } from "@/redux/store";
import { setBootstrapError, updateTokens } from "@/redux/session-slice";
import { logError } from "@/utils/logger";
import * as SecureStore from "expo-secure-store";
import {
  SECURE_STORAGE_ACCESS_TOKEN_KEY,
  SECURE_STORAGE_REFRESH_TOKEN_KEY,
} from "@/constants/secureStorageKeyConstants";

/** Readable after the first unlock since boot, so a refresh while the phone is locked can still persist. */
const KEYCHAIN_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/**
 * Saves or deletes tokens in the device's hardware-encrypted storage.
 */
async function writeSecureSessionTokens(
  accessToken: string | null,
  refreshToken: string | null,
): Promise<void> {
  // If an accessToken exists, save it. Otherwise, attempt to delete it.
  if (accessToken) {
    await SecureStore.setItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY, accessToken, KEYCHAIN_OPTIONS);
  } else {
    // We use .catch() to ignore errors if the key was already missing.
    await SecureStore.deleteItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY).catch(() => undefined);
  }

  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY, refreshToken, KEYCHAIN_OPTIONS);
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
    SecureStore.getItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY, KEYCHAIN_OPTIONS),
    SecureStore.getItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY, KEYCHAIN_OPTIONS),
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
    if (!accessToken || !refreshToken) return null;
    dispatch(updateTokens({ accessToken, refreshToken }));
    return accessToken;
  } catch (error) {
    logError("[AUTH]", error, { phase: "bootstrap-keychain" });
    dispatch(setBootstrapError("Could not access your stored credentials. Tap Retry to try again."));
    return undefined;
  }
}

/** The only keychain writer for session tokens; a failed write is retried until the newest pair lands. */
export function persistTokens(accessToken: string | null, refreshToken: string | null, attempt = 1): void {
  writeSecureSessionTokens(accessToken, refreshToken).catch((error: unknown) => {
    logError("[AUTH]", error, { phase: "persist-tokens", attempt });
    const { session } = store.getState();
    const stillNewest = session.accessToken === accessToken && session.refreshToken === refreshToken;
    if (stillNewest && attempt < 5) setTimeout(() => persistTokens(accessToken, refreshToken, attempt + 1), attempt * 2000);
  });
}
