// Shared notification scheduling logic — used by both the Settings screen
// (toggle / time picker) and the onboarding "Allow notifications" step, so
// granting permission during onboarding actually schedules the daily
// reminder instead of only flipping the `notificationsEnabled` preference.
//
// NO static import of expo-notifications — it throws at module-evaluation
// time in Expo Go (SDK 54). The only safe pattern is a dynamic import()
// inside the function body, wrapped in try/catch.

import { Platform } from 'react-native';

// Sets up everything Android/foreground notification DISPLAY depends on —
// called once from the root layout, before anything is ever scheduled:
//
// 1. setNotificationHandler — per expo-notifications' own docs, "the default
//    behavior when the handler is not set... is not to show the notification"
//    while the app is in the foreground. Without this, a notification firing
//    while the app is still open (e.g. the dev test button, 10s later) is
//    silently swallowed — this was likely the actual cause of the test
//    notification never appearing.
// 2. The 'default' Android notification channel — without a channelId wired
//    into a trigger, expo-notifications silently falls back to its own
//    auto-created channel instead (see BaseNotificationBuilder.kt), so this
//    is paired with `channelId: 'default'` on every scheduleNotificationAsync
//    call below; creating the channel alone would do nothing.
// 3. A received-listener that logs to the terminal, to confirm delivery.
export async function setupNotificationHandling(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifs = await import('expo-notifications');

    Notifs.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifs.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifs.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5DCAA5',
      });
    }

    Notifs.addNotificationReceivedListener((notification) => {
      console.log('[Notification received]', notification);
    });
  } catch {
    // expo-notifications not available (Expo Go) — nothing to set up.
  }
}

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
        title: 'Hush Tinnitus',
        body: "Time for your daily check-in — a moment to log how you're feeling today",
        sound: true,
        color: '#0D4F5C',
      },
      trigger: {
        type: Notifs.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'default',
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
            title: 'Hush Tinnitus — 4 Week Check-in',
            body: 'It has been 4 weeks since your first CREST assessment. Head to the Track tab to see how you are progressing 📊',
            sound: true,
            color: '#0D4F5C',
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w4, channelId: 'default' },
        });
      }

      if (w8.getTime() > now) {
        await Notifs.scheduleNotificationAsync({
          identifier: 'hush-crest-week8',
          content: {
            title: 'Hush Tinnitus — 8 Week Check-in',
            body: 'It has been 8 weeks since your first CREST assessment. Time for your final check-in to track your progress 📊',
            sound: true,
            color: '#0D4F5C',
          },
          trigger: { type: Notifs.SchedulableTriggerInputTypes.DATE, date: w8, channelId: 'default' },
        });
      }
    }

    return {};
  } catch {
    return { unavailable: true };
  }
}
