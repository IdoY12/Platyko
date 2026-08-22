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
  SchedulableTriggerInputTypes: { DAILY: "daily" },
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
    fakes.scheduled.splice(0);
    getStateMock.mockReturnValue({
      session: { hasHydrated: true, isGuest: true, isAuthenticated: false },
      profile: { commitment: "15", notificationsEnabled: true },
    });
  });

  it("two overlapping calls end with exactly one scheduled notification", async () => {
    await Promise.all([syncDailyPracticeReminder(), syncDailyPracticeReminder()]);

    expect(fakes.scheduled).toHaveLength(1);
    expect(fakes.storage.get("scheduledNotificationId")).toBe(fakes.scheduled[0]);
  });

  it("heals a pre-existing orphan: cancels everything and reschedules a single reminder", async () => {
    fakes.scheduled.push("orphan", "tracked");
    fakes.storage.set("scheduledNotificationId", "tracked");
    fakes.storage.set("dailyPracticeReminderFp", "true|15|true|false");

    await syncDailyPracticeReminder();

    expect(fakes.scheduled).toHaveLength(1);
    expect(fakes.scheduled).not.toContain("orphan");
    expect(fakes.storage.get("scheduledNotificationId")).toBe(fakes.scheduled[0]);
  });
});
