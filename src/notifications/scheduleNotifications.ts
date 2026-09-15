// Shared notification scheduling logic — used by both the Settings screen
// (toggle / time picker) and the onboarding "Allow notifications" step, so
// granting permission during onboarding actually schedules the daily
// reminder instead of only flipping the `notificationsEnabled` preference.
//
// NO static import of expo-notifications — it throws at module-evaluation
// time in Expo Go (SDK 54). The only safe pattern is a dynamic import()
// inside the function body, wrapped in try/catch.

import { Platform } from 'react-native';

export async function applyNotifications(
  enabled: boolean,
  time: string,
  firstLaunchDate: string | null | undefined,
): Promise<{ unavailable?: boolean }> {
  if (Platform.OS === 'web') return {};
  try {
    const Notifs = await import('expo-notifications');

    // Cancel all existing Hush notifications first
    for (const id of ['hush-daily', 'hush-crest-week4', 'hush-crest-week8']) {
      Notifs.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    if (!enabled) return {};

    // Ensure permission is granted
    const { status } = await Notifs.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifs.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') return {};

    // Daily check-in
    const [hour, minute] = time.split(':').map(Number);
    await Notifs.scheduleNotificationAsync({
      identifier: 'hush-daily',
      content: {
        title: 'Daily check-in',
        body: 'How is your tinnitus today? Take a moment to log your symptoms.',
        sound: true,
      },
      trigger: {
        type: Notifs.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    // CREST retest reminders — auto-scheduled based on firstLaunchDate
    if (firstLaunchDate) {
      const launch = new Date(firstLaunchDate);
      const now = Date.now();

      const w4 = new Date(launch.getTime() + 28 * 86_400_000);
      const w8 = new Date(launch.getTime() + 56 * 86_400_000);

      if (w4.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-crest-week4',
          content: {
            title: 'Week 4 CREST check-in',
            body: "It's been 4 weeks — time to retake the CREST assessment and track your progress.",
            sound: true,
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w4 },
        });
      }

      if (w8.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-crest-week8',
          content: {
            title: 'Week 8 CREST check-in',
            body: "It's been 8 weeks — time to retake the CREST assessment and see how far you've come.",
            sound: true,
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w8 },
        });
      }
    }

    return {};
  } catch {
    return { unavailable: true };
  }
}
