import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import store from "@/redux/store";

const dailyPracticeReminderFpKey = "dailyPracticeReminderFp";
const scheduledNotificationIdKey = "scheduledNotificationId";

let syncQueue: Promise<void> = Promise.resolve();

export function syncDailyPracticeReminder(): Promise<void> {
  // Serialized: overlapping calls run one after another so they can never double-schedule.
  syncQueue = syncQueue.then(runReminderSync, runReminderSync);
  return syncQueue;
}

/** True when notifications are (or become) granted. A previous denial returns false without a prompt. */
async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === Notifications.PermissionStatus.GRANTED) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === Notifications.PermissionStatus.GRANTED;
}

async function runReminderSync(): Promise<void> {
  const { session, profile } = store.getState();
  if (!session.hasHydrated) return;

  const dailyGoalMinutes = Number(profile.commitment);
  const notificationsEnabled = profile.notificationsEnabled;
  const allow = (session.isGuest || session.isAuthenticated) && notificationsEnabled;
  const fp = `${allow}|${dailyGoalMinutes}|${session.isGuest}|${session.isAuthenticated}`;

  const fpStored = await AsyncStorage.getItem(dailyPracticeReminderFpKey);
  const scheduledNotificationIdStored = await AsyncStorage.getItem(scheduledNotificationIdKey);
  const scheduledIds = (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
  const osMatchesStored = scheduledIds.length === 1 && scheduledIds[0] === scheduledNotificationIdStored;
  if (fpStored === fp && scheduledNotificationIdStored && osMatchesStored) return;

  // The daily reminder is the only notification this app schedules, so cancelling all
  // scheduled notifications also heals orphans left behind by past double-scheduling.
  await Notifications.cancelAllScheduledNotificationsAsync();

  // The OS prompt appears here, right before the first reminder is scheduled, never at cold launch.
  if (!allow || !(await ensureNotificationPermission())) {
    await AsyncStorage.multiRemove([scheduledNotificationIdKey, dailyPracticeReminderFpKey]);
    return;
  }

  const scheduledNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily practice",
      body: `Have you completed your daily goal? You're aiming for ${dailyGoalMinutes} min today.`,
      ...(Platform.OS === "android" ? { channelId: "practice-reminders" } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
  });

  await AsyncStorage.multiSet([
    [scheduledNotificationIdKey, scheduledNotificationId],
    [dailyPracticeReminderFpKey, fp],
  ]);
}
