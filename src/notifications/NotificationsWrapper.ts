// Safe wrapper for expo-notifications.
//
// In non-EAS builds (Expo Go), Metro resolves 'expo-notifications' to
// NotificationsStub.ts, so re-exporting from 'expo-notifications' here
// transparently gives callers the stub — no crash, no imports to guard.
//
// In EAS builds, 'expo-notifications' resolves to the real module, so
// callers get the full implementation.
//
// notifications.tsx imports from this file so the indirection is explicit
// and the aliasing behaviour is documented in one place.

export {
  requestPermissionsAsync,
  getPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  setNotificationHandler,
} from 'expo-notifications';
