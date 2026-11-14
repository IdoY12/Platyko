import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import store, { type RootState } from "@/redux/store";
import { ONBOARDING_SEEN_STORAGE_KEY } from "@/constants/onboardingStorageConstants";
import { getActiveLanguage, t } from "@/i18n/translate";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

const fingerprintKey = "dailyPracticeReminderFp";
const scheduledIdsKey = "scheduledReminderIds";
const REMINDER_HOUR = 19;
/** Reminders are scheduled a week ahead and rescheduled whenever the app opens or a lesson ends. */
const REMINDER_DAYS = 7;

/**
 * The smart daily reminder (PRD 15.6): one evening reminder per day for the next week, and none
 * today once the day's lesson goal is met. On a device this is a local notification, so it works
 * for guests and without a push service; the server push for accounts uses the same rule.
 */
export function reminderTimes(now: Date, goalMetToday: boolean): Date[] {
  return Array.from({ length: REMINDER_DAYS + 1 }, (_unused, offset) => {
    const time = new Date(now);
    time.setDate(now.getDate() + offset);
    time.setHours(REMINDER_HOUR, 0, 0, 0);
    return time;
  })
    .filter((time, offset) => (offset === 0 ? !goalMetToday && time > now : true))
    .slice(0, REMINDER_DAYS);
}

/** Whether today's lessons have reached the learner's daily goal. */
export function isDailyGoalMet({ learning }: Pick<RootState, "learning">, today: string): boolean {
  const day = learning.progress.practiceDays.find((practiced) => practiced.date === today);
  return (day?.lessonsCompleted ?? 0) >= learning.goals.dailyGoalLessons;
}

let syncQueue: Promise<void> = Promise.resolve();

export function syncDailyPracticeReminder(): Promise<void> {
  // Serialized: overlapping calls run one after another so they can never double-schedule.
  syncQueue = syncQueue.then(runReminderSync, runReminderSync);
  return syncQueue;
}

/** True when notifications are (or become) granted. The OS dialog is shown only while undecided, never again after a denial. */
async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === Notifications.PermissionStatus.GRANTED) return true;
  if (current.status !== Notifications.PermissionStatus.UNDETERMINED) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === Notifications.PermissionStatus.GRANTED;
}

async function runReminderSync(): Promise<void> {
  const state = store.getState();
  const { session, profile, learning } = state;
  if (!session.hasHydrated) return;

  const today = getStreakCalendarDate();
  const goalMet = isDailyGoalMet(state, today);
  // The wizard writes this key as its very last step and then calls this sync, so the OS permission
  // prompt can never appear on top of the first-launch wizard.
  const onboardingDone = (await AsyncStorage.getItem(ONBOARDING_SEEN_STORAGE_KEY)) === "1";
  const allow = (session.isGuest || session.isAuthenticated) && profile.notificationsEnabled && onboardingDone;
  const fingerprint = `${allow}|${today}|${goalMet}|${learning.goals.dailyGoalLessons}|${getActiveLanguage()}`;

  const storedFingerprint = await AsyncStorage.getItem(fingerprintKey);
  const storedIds: string[] = JSON.parse((await AsyncStorage.getItem(scheduledIdsKey)) ?? "[]") as string[];
  const osIds = (await Notifications.getAllScheduledNotificationsAsync()).map((notification) => notification.identifier);
  const osMatchesStored = osIds.length === storedIds.length && storedIds.every((id) => osIds.includes(id));
  if (storedFingerprint === fingerprint && storedIds.length > 0 && osMatchesStored) return;

  // Reminders are the only notifications this app schedules, so cancelling all of them also
  // heals orphans left behind by an earlier version.
  await Notifications.cancelAllScheduledNotificationsAsync();

  // The OS prompt appears here, right before the first reminder is scheduled, never at cold launch.
  if (!allow || !(await ensureNotificationPermission())) {
    await AsyncStorage.multiRemove([scheduledIdsKey, fingerprintKey]);
    return;
  }

  const ids: string[] = [];
  for (const date of reminderTimes(new Date(), goalMet)) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t("reminder.title"),
          body: t("reminder.body", { lessons: learning.goals.dailyGoalLessons }),
          ...(Platform.OS === "android" ? { channelId: "practice-reminders" } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      }),
    );
  }
  await AsyncStorage.multiSet([
    [scheduledIdsKey, JSON.stringify(ids)],
    [fingerprintKey, fingerprint],
  ]);
}
