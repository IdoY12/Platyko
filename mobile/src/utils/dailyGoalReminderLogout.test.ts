import { beforeEach, describe, expect, it, vi } from "vitest";
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

vi.mock("react-native", () => ({ Platform: { OS: "ios" }, Alert: { alert: vi.fn() } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), multiSet: vi.fn(), multiRemove: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DAILY: "daily" },
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
}));
vi.mock("@/utils/secureSessionTokens", () => ({ clearSecureSessionTokens: vi.fn(async () => {}) }));
vi.mock("@/services/auth", () => ({ apiErrorMessage: () => "error" }));

const getStateMock = vi.fn();
vi.mock("@/redux/store", () => ({ default: { getState: () => getStateMock() } }));

import * as Notifications from "expo-notifications";
import type { AppDispatch } from "@/redux/store";
import type UserService from "@/services/auth-aware/UserService";
import { setNotificationsEnabled } from "@/redux/profile-slice";
import { resetStoresAfterLogout } from "@/utils/resetStoresAfterLogout";
import { deleteAccountRequest } from "@/utils/profileAccountMutations";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";

async function expectReminderCleared(dispatch: ReturnType<typeof vi.fn>) {
  await syncDailyPracticeReminder(); // drains the serialized queue behind the fire-and-forget call
  expect(dispatch).toHaveBeenCalledWith(setNotificationsEnabled(false));
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
}

describe("logout and account deletion clear the daily reminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
    getStateMock.mockReturnValue({
      session: { hasHydrated: true, isGuest: true, isAuthenticated: false },
      profile: { commitment: "15", notificationsEnabled: false },
    });
  });

  it("logout: disables notifications and leaves nothing scheduled", async () => {
    const dispatch = vi.fn();
    resetStoresAfterLogout(dispatch as unknown as AppDispatch);
    await expectReminderCleared(dispatch);
  });

  it("account deletion: disables notifications and leaves nothing scheduled", async () => {
    const dispatch = vi.fn();
    const user = { deleteAccount: vi.fn(async () => {}) } as unknown as UserService;
    await deleteAccountRequest(user, dispatch as unknown as AppDispatch, vi.fn());
    await expectReminderCleared(dispatch);
  });
});
