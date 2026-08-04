import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import store from "@/redux/store";

const dailyPracticeReminderFpKey = "dailyPracticeReminderFp";
const scheduledNotificationIdKey = "scheduledNotificationId";

export async function syncDailyPracticeReminder(): Promise<void> {
  const { session, profile } = store.getState();
  if (!session.hasHydrated) return;

  const dailyGoalMinutes = Number(profile.commitment);
  const notificationsEnabled = profile.notificationsEnabled;
  const allow = (session.isGuest || session.isAuthenticated) && notificationsEnabled;
  const fp = `${allow}|${dailyGoalMinutes}|${session.isGuest}|${session.isAuthenticated}`;

  const fpStored = await AsyncStorage.getItem(dailyPracticeReminderFpKey);
  const scheduledNotificationIdStored = await AsyncStorage.getItem(scheduledNotificationIdKey);
  if (fpStored === fp && scheduledNotificationIdStored) return;

  if (scheduledNotificationIdStored) {
    try {
      await Notifications.cancelScheduledNotificationAsync(scheduledNotificationIdStored);
    } catch {
      /* ignore stale scheduledNotificationId */
    }
  }

  if (!allow) {
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
