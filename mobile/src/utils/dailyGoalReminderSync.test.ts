import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), multiSet: vi.fn(), multiRemove: vi.fn() },
}));

vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DAILY: "daily" },
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
}));

const getStateMock = vi.fn<() => unknown>();
vi.mock("@/redux/store", () => ({ default: { getState: () => getStateMock() } }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";

describe("syncDailyPracticeReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
  });

  it("guest: schedules daily 19:00 and body includes dailyGoalMinutes from commitment", async () => {
    getStateMock.mockReturnValue({
      session: { hasHydrated: true, isGuest: true, isAuthenticated: false },
      profile: { commitment: "15", notificationsEnabled: true },
    });
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    vi.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue("nid-guest");

    await syncDailyPracticeReminder();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const req = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0];
    expect(req.content.body).toContain("15");
    expect(req.trigger).toEqual({ type: "daily", hour: 19, minute: 0 });
    expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
      ["scheduledNotificationId", "nid-guest"],
      ["dailyPracticeReminderFp", "true|15|true|false"],
    ]);
  });

  it("signed-in notifications off: cancels all scheduled notifications and clears AsyncStorage keys", async () => {
    getStateMock.mockReturnValue({
      session: { hasHydrated: true, isGuest: false, isAuthenticated: true },
      profile: { commitment: "10", notificationsEnabled: false },
    });
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce("prev-id");

    await syncDailyPracticeReminder();

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(["scheduledNotificationId", "dailyPracticeReminderFp"]);
  });

  it("skips schedule when fingerprint, stored id, and OS state are unchanged", async () => {
    getStateMock.mockReturnValue({
      session: { hasHydrated: true, isGuest: true, isAuthenticated: false },
      profile: { commitment: "25", notificationsEnabled: true },
    });
    const fp = "true|25|true|false";
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (k: string) =>
      k === "dailyPracticeReminderFp" ? fp : k === "scheduledNotificationId" ? "same" : null,
    );
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([
      { identifier: "same" } as Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>[number],
    ]);

    await syncDailyPracticeReminder();

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});
