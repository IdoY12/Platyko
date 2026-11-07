import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@/config/network";
import store from "@/redux/store";
import { updateTokens } from "@/redux/session-slice";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Only the server rejecting the refresh token (400/401/403) means the session is gone; anything else is transient. */
function refreshWasRejected(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return status === 400 || status === 401 || status === 403;
}

let refreshInFlight: Promise<{ accessToken: string; refreshToken: string }> | null = null;

export default abstract class AuthAware {
  protected axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

    this.axiosInstance.interceptors.request.use((config) => {
      const { accessToken, isGuest } = store.getState().session;
      if (accessToken && !isGuest) config.headers.set("Authorization", `Bearer ${accessToken}`);
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (!axios.isAxiosError(error)) throw error;
        const status = error.response?.status;
        const config = error.config as RetryableConfig | undefined;
        if (status !== 401 || !config || config._retry) throw error;
        // Guests never hold a session: a stray 401 must not wipe their local XP/streak.
        if (!store.getState().session.isAuthenticated) throw error;
        config._retry = true;
        // Redux holds the newest pair the moment a rotation lands (SecureStore is written after it), so a
        // late 401 never replays an already-rotated token. A request sent with an older access token
        // than the store's simply retries with the fresh one.
        const { accessToken: currentAccessToken, refreshToken } = store.getState().session;
        if (currentAccessToken && config.headers.get("Authorization") !== `Bearer ${currentAccessToken}`) {
          config.headers.set("Authorization", `Bearer ${currentAccessToken}`);
          return this.axiosInstance.request(config);
        }
        if (!refreshToken) throw error;
        try {
          if (!refreshInFlight) {
            refreshInFlight = axios
              .post<{ accessToken: string; refreshToken: string }>(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: REQUEST_TIMEOUT_MS })
              .then((r) => r.data)
              .finally(() => { refreshInFlight = null; });
          }
          const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } = await refreshInFlight;
          // The storage subscriber persists (and retries) the new pair; this request must not wait on the keychain.
          store.dispatch(updateTokens({ accessToken: nextAccessToken, refreshToken: nextRefreshToken }));
          config.headers.set("Authorization", `Bearer ${nextAccessToken}`);
          return this.axiosInstance.request(config);
        } catch (refreshError) {
          if (refreshWasRejected(refreshError)) { resetStoresAfterLogout(store.dispatch); throw error; }
          // Transient (timeout / 5xx): callers must see that, not the original 401, or they would log out.
          throw refreshError;
        }
      },
    );
  }

  protected get jwt(): string { return store.getState().session.accessToken ?? ""; }
}
