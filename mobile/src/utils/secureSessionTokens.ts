import type { AppDispatch } from "@/redux/store";
import { setBootstrapError, updateTokens } from "@/redux/session-slice";
import { logError } from "@/utils/logger";
import * as SecureStore from "expo-secure-store";
import {
  SECURE_STORAGE_ACCESS_TOKEN_KEY,
  SECURE_STORAGE_REFRESH_TOKEN_KEY,
} from "@/constants/secureStorageKeyConstants";

/** Readable after the first unlock since boot, so a refresh while the phone is locked can still persist. */
const KEYCHAIN_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/** Saves or deletes tokens in the device's hardware-encrypted storage. */
async function writeSecureSessionTokens(accessToken: string | null, refreshToken: string | null): Promise<void> {
  if (accessToken) {
    await SecureStore.setItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY, accessToken, KEYCHAIN_OPTIONS);
  } else {
    await SecureStore.deleteItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY); // a failed delete retries like a failed write
  }

  if (refreshToken) {
    await SecureStore.setItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY, refreshToken, KEYCHAIN_OPTIONS);
  } else {
    await SecureStore.deleteItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY);
  }
}

/** Fetches tokens from the secure vault. Throws if SecureStore is unavailable. */
export async function readSecureSessionTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(SECURE_STORAGE_ACCESS_TOKEN_KEY, KEYCHAIN_OPTIONS),
    SecureStore.getItemAsync(SECURE_STORAGE_REFRESH_TOKEN_KEY, KEYCHAIN_OPTIONS),
  ]);
  return { accessToken, refreshToken };
}

export const clearSecureSessionTokens = async (): Promise<void> => { persistTokens(null, null); await writeChain; };

/** Retry path after a failed launch-time keychain read: read again; undefined means "still unreadable". */
export async function readTokensAgain(dispatch: AppDispatch): Promise<string | null | undefined> {
  try {
    // The refresh token is what keeps a session alive; a missing access token is renewed on the first 401.
    const { accessToken, refreshToken } = await readSecureSessionTokens();
    if (!refreshToken) return null;
    dispatch(updateTokens({ accessToken: accessToken ?? "", refreshToken }));
    return refreshToken;
  } catch (error) {
    logError("[AUTH]", error, { phase: "bootstrap-keychain" });
    dispatch(setBootstrapError("Could not access your stored credentials. Tap Retry to try again."));
    return undefined;
  }
}

/** The newest pair that still has to reach the keychain; null once it landed. */
let pendingTokens: { accessToken: string | null; refreshToken: string | null } | null = null;
/** Keychain writes run strictly one after another, so an older pair can never land after a newer one. */
let writeChain: Promise<void> = Promise.resolve();

function flushPendingTokens(attempt: number): void {
  writeChain = writeChain.then(async () => {
    const pair = pendingTokens;
    if (!pair) return;
    try {
      await writeSecureSessionTokens(pair.accessToken, pair.refreshToken);
      if (pendingTokens === pair) pendingTokens = null;
    } catch (error) {
      logError("[AUTH]", error, { phase: "persist-tokens", attempt });
      if (pendingTokens === pair && attempt < 5) setTimeout(() => flushPendingTokens(attempt + 1), attempt * 2000);
    }
  });
}

/** The only keychain writer for session tokens (sign-out included); a failed write retries, and again on each foreground. */
export function persistTokens(accessToken: string | null, refreshToken: string | null): void {
  pendingTokens = { accessToken, refreshToken };
  flushPendingTokens(1);
}

export const retryUnsavedTokens = (): void => flushPendingTokens(1);
