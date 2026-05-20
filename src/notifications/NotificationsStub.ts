// No-op stub for expo-notifications.
// Metro resolves 'expo-notifications' to this file in non-EAS builds
// (Expo Go) so the module is never loaded and the app does not crash.

type PermissionResponse = {
  status: 'undetermined' | 'denied' | 'granted';
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
  ios?: { status: number };
  android?: { importance: number };
};

export async function requestPermissionsAsync(): Promise<PermissionResponse> {
  return {
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
    expires: 'never',
  };
}

export async function getPermissionsAsync(): Promise<PermissionResponse> {
  return {
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
    expires: 'never',
  };
}

export async function scheduleNotificationAsync(
  _request: unknown
): Promise<string> {
  return '';
}

export async function cancelScheduledNotificationAsync(
  _identifier: string
): Promise<void> {}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {}

export async function getAllScheduledNotificationsAsync(): Promise<unknown[]> {
  return [];
}

export function addNotificationReceivedListener(
  _listener: unknown
): { remove(): void } {
  return { remove() {} };
}

export function addNotificationResponseReceivedListener(
  _listener: unknown
): { remove(): void } {
  return { remove() {} };
}

export function setNotificationHandler(_handler: unknown): void {}

