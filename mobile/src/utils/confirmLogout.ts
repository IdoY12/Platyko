import { logError } from "@/utils/logger";
import type { AppDispatch } from "@/redux/store";
import UserService from "@/services/auth-aware/UserService";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";

export async function confirmLogout(
  dispatch: AppDispatch,
  accessToken: string | null,
  refreshToken: string | null,
): Promise<void> {
  try {
    if (accessToken) {
      await new UserService().logout(refreshToken ?? "");
    }
  } catch (error) {
    // Still clear the local session when the network call fails.
    logError("[AUTH]", error, { phase: "logout" });
  } finally {
    resetStoresAfterLogout(dispatch);
  }
}
