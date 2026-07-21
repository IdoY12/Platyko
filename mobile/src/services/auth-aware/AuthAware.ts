import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/network";
import store from "@/redux/store";
import { updateTokens } from "@/redux/session-slice";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";
import { readSecureSessionTokens, writeSecureSessionTokens } from "@/utils/secureSessionTokens";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Without a timeout, a request to an unreachable dev host hangs indefinitely and loading spinners never resolve.
const REQUEST_TIMEOUT_MS = 10_000;

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
        config._retry = true;
        let refreshToken: string | null;
        try {
          refreshToken = (await readSecureSessionTokens()).refreshToken;
        } catch {
          resetStoresAfterLogout(store.dispatch);
          throw error;
        }
        if (!refreshToken) { resetStoresAfterLogout(store.dispatch); throw error; }
        try {
          if (!refreshInFlight) {
            refreshInFlight = axios
              .post<{ accessToken: string; refreshToken: string }>(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: REQUEST_TIMEOUT_MS })
              .then((r) => r.data)
              .finally(() => { refreshInFlight = null; });
          }
          const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } = await refreshInFlight;
          store.dispatch(updateTokens({ accessToken: nextAccessToken, refreshToken: nextRefreshToken }));
          await writeSecureSessionTokens(nextAccessToken, nextRefreshToken);
          if (config.headers && typeof config.headers.set === "function") {
            config.headers.set("Authorization", `Bearer ${nextAccessToken}`);
          } else {
            config.headers = { ...config.headers, Authorization: `Bearer ${nextAccessToken}` } as RetryableConfig["headers"];
          }
          return this.axiosInstance.request(config);
        } catch { resetStoresAfterLogout(store.dispatch); throw error; }
      },
    );
  }

  protected get jwt(): string { return store.getState().session.accessToken ?? ""; }
}
