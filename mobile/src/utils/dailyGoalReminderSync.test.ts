import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), multiSet: vi.fn(), multiRemove: vi.fn() },
}));
vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date" },
  PermissionStatus: { GRANTED: "granted", UNDETERMINED: "undetermined" },
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
import { reminderTimes, syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

const guestSession = { hasHydrated: true, isGuest: true, isAuthenticated: false };
const stateWith = (notificationsEnabled: boolean, lessonsToday = 0) => ({
  session: guestSession,
  profile: { notificationsEnabled },
  learning: { progress: { practiceDays: [{ date: getStreakCalendarDate(), lessonsCompleted: lessonsToday, itemsAnswered: 0, xpEarned: 0 }] }, goals: { dailyGoalLessons: 1 } },
});
const onboardingDone = async (key: string) => (key === "onboarding_seen_v1" ? "1" : null);
const storageKeys = ["scheduledReminderIds", "dailyPracticeReminderFp"];
const denied = { status: "denied" } as never;

describe("reminderTimes", () => {
  it("reminds at 19:00 for a week, today included while the goal is open and the hour is ahead", () => {
    const morning = new Date(2026, 10, 14, 9, 0);
    const times = reminderTimes(morning, false);
    expect(times).toHaveLength(7);
    expect(times[0]).toEqual(new Date(2026, 10, 14, 19, 0));
    expect(times[6]).toEqual(new Date(2026, 10, 20, 19, 0));
  });

  it("skips today once the goal is met or the hour has passed", () => {
    expect(reminderTimes(new Date(2026, 10, 14, 9, 0), true)[0]).toEqual(new Date(2026, 10, 15, 19, 0));
    expect(reminderTimes(new Date(2026, 10, 14, 20, 0), false)[0]).toEqual(new Date(2026, 10, 15, 19, 0));
  });
});

describe("syncDailyPracticeReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
    vi.mocked(AsyncStorage.getItem).mockImplementation(onboardingDone);
    vi.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async () => `nid-${vi.mocked(Notifications.scheduleNotificationAsync).mock.calls.length}`);
  });

  it("guest after onboarding: schedules a week of dated, translated reminders", async () => {
    getStateMock.mockReturnValue(stateWith(true));
    await syncDailyPracticeReminder();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
    const request = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0];
    expect(request.content.title).toBe("The river is waiting");
    expect(request.trigger).toMatchObject({ type: "date" });
  });

  it("goal met today: no reminder today", async () => {
    getStateMock.mockReturnValue(stateWith(true, 1));
    await syncDailyPracticeReminder();
    const firstDate = (vi.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0].trigger as { date: Date }).date;
    expect(firstDate.toDateString()).not.toBe(new Date().toDateString());
  });

  it("before the wizard is persisted: never asks for permission and schedules nothing", async () => {
    getStateMock.mockReturnValue(stateWith(true));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await syncDailyPracticeReminder();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(storageKeys);
  });

  it("notifications off: cancels everything and clears the stored keys", async () => {
    getStateMock.mockReturnValue(stateWith(false));
    await syncDailyPracticeReminder();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(storageKeys);
  });

  it("permission denied: schedules nothing and stores nothing", async () => {
    getStateMock.mockReturnValue(stateWith(true));
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(denied);
    vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(denied);
    await syncDailyPracticeReminder();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(storageKeys);
  });
});
