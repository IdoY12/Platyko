export const SECURE_STORAGE_ACCESS_TOKEN_KEY = "platyko_secure_access_token_v1";

export const SECURE_STORAGE_REFRESH_TOKEN_KEY = "platyko_secure_refresh_token_v1";

/**
 * Access token of a restored signed-in session whose real one is missing or unreadable. Every screen
 * keeps treating the user as signed in; the server answers 401 and the client renews with the refresh
 * token (or fails visibly when none is available) instead of silently acting as a guest.
 */
export const EXPIRED_ACCESS_TOKEN = "expired";

export const KEYCHAIN_UNREADABLE_MESSAGE = "Could not access your stored credentials. Tap Retry to try again.";
