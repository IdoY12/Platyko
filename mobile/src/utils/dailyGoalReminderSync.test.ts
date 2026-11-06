import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), multiSet: vi.fn(), multiRemove: vi.fn() },
}));
vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DAILY: "daily" },
  PermissionStatus: { GRANTED: "granted" },
  getPermissionsAsync: vi.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: vi.fn(async () => ({ status: "granted" })),
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
}));
const getStateMock = vi.fn<() => unknown>();
vi.mock("@/redux/store", () => ({ default: { getState: () => getStateMock() } }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";

const guestSession = { hasHydrated: true, isGuest: true, isAuthenticated: false };
const onboardedProfile = (commitment: string, notificationsEnabled = true) => ({ commitment, notificationsEnabled });
const onboardingDone = async (key: string) => (key === "onboarding_seen_v1" ? "1" : null);
const storageKeys = ["scheduledNotificationId", "dailyPracticeReminderFp"];
const denied = { status: "denied" } as never;

describe("syncDailyPracticeReminder", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]); vi.mocked(AsyncStorage.getItem).mockImplementation(onboardingDone); });

  it("guest after onboarding: schedules daily 19:00 with the commitment minutes in the body", async () => {
    getStateMock.mockReturnValue({ session: guestSession, profile: onboardedProfile("15") });
    vi.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue("nid-guest");
    await syncDailyPracticeReminder();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const req = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0];
    expect(req.content.body).toContain("15");
    expect(req.trigger).toEqual({ type: "daily", hour: 19, minute: 0 });
    expect(AsyncStorage.multiSet).toHaveBeenCalledWith([["scheduledNotificationId", "nid-guest"], ["dailyPracticeReminderFp", "true|15|true|false"]]);
  });

  it("before the wizard is persisted: never asks for permission and schedules nothing", async () => {
    getStateMock.mockReturnValue({ session: guestSession, profile: onboardedProfile("15") });
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await syncDailyPracticeReminder();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(storageKeys);
  });

  it("signed-in with notifications off: cancels everything and clears the stored keys", async () => {
    getStateMock.mockReturnValue({ session: { hasHydrated: true, isGuest: false, isAuthenticated: true }, profile: onboardedProfile("10", false) });
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce("1").mockResolvedValueOnce(null).mockResolvedValueOnce("prev-id");
    await syncDailyPracticeReminder();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(storageKeys);
  });

  it("skips scheduling when fingerprint, stored id and OS state are unchanged", async () => {
    getStateMock.mockReturnValue({ session: guestSession, profile: onboardedProfile("25") });
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (k: string) =>
      k === "dailyPracticeReminderFp" ? "true|25|true|false" : k === "scheduledNotificationId" ? "same" : onboardingDone(k),
    );
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([{ identifier: "same" } as never]);
    await syncDailyPracticeReminder();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it("permission denied: schedules nothing and stores nothing", async () => {
    getStateMock.mockReturnValue({ session: guestSession, profile: onboardedProfile("15") });
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(denied);
    vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(denied);
    await syncDailyPracticeReminder();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(storageKeys);
  });
});
