import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const fakes = vi.hoisted(() => ({ storage: new Map<string, string>(), scheduled: [] as string[], nextId: 0 }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => fakes.storage.get(key) ?? null,
    multiSet: async (pairs: [string, string][]) => void pairs.forEach(([k, v]) => fakes.storage.set(k, v)),
    multiRemove: async (keys: string[]) => void keys.forEach((k) => fakes.storage.delete(k)),
  },
}));

vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date" },
  PermissionStatus: { GRANTED: "granted", UNDETERMINED: "undetermined" },
  getPermissionsAsync: async () => ({ status: "granted" }),
  requestPermissionsAsync: async () => ({ status: "granted" }),
  scheduleNotificationAsync: async () => {
    const id = `nid-${fakes.nextId++}`;
    fakes.scheduled.push(id);
    return id;
  },
  cancelAllScheduledNotificationsAsync: async () => void fakes.scheduled.splice(0),
  getAllScheduledNotificationsAsync: async () => fakes.scheduled.map((identifier) => ({ identifier })),
}));

const getStateMock = vi.fn<() => unknown>();
vi.mock("@/redux/store", () => ({ default: { getState: () => getStateMock() } }));

import { syncDailyPracticeReminder } from "@/utils/dailyGoalNotificationCheck";

describe("syncDailyPracticeReminder hardening", () => {
  beforeEach(() => {
    fakes.storage.clear();
    fakes.storage.set("onboarding_seen_v1", "1");
    fakes.scheduled.splice(0);
    getStateMock.mockReturnValue({
      session: { hasHydrated: true, isGuest: true, isAuthenticated: false },
      profile: { notificationsEnabled: true },
      learning: { progress: { practiceDays: [] }, goals: { dailyGoalLessons: 1 } },
    });
  });

  it("two overlapping calls end with exactly one week of reminders", async () => {
    await Promise.all([syncDailyPracticeReminder(), syncDailyPracticeReminder()]);

    expect(fakes.scheduled).toHaveLength(7);
    expect(JSON.parse(fakes.storage.get("scheduledReminderIds") ?? "[]")).toEqual(fakes.scheduled);
  });

  it("heals a pre-existing orphan: cancels everything and reschedules the week", async () => {
    await syncDailyPracticeReminder();
    fakes.scheduled.push("orphan");

    await syncDailyPracticeReminder();

    expect(fakes.scheduled).toHaveLength(7);
    expect(fakes.scheduled).not.toContain("orphan");
  });
});
