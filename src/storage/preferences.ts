import { UserPreferences } from '@/src/types';
import { getDb, isNativePlatform } from './database';

type PreferencesRow = {
  id: number;
  onboardingComplete: number;
  isPremium: number;
  darkMode: string;
  textSize: string;
  notificationsEnabled: number;
  notificationTime: string;
  firstLaunchDate: string;
  lastCRESTDate: string | null;
  week4Prompted: number;
  week8Prompted: number;
  matchedPitchHz: number | null;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingComplete: false,
  isPremium: false,
  darkMode: 'system',
  textSize: 'medium',
  notificationsEnabled: false,
  notificationTime: '09:00',
  firstLaunchDate: new Date().toISOString(),
  lastCRESTDate: null,
  week4Prompted: false,
  week8Prompted: false,
  matchedPitchHz: null,
};

function rowToPreferences(row: PreferencesRow): UserPreferences {
  return {
    onboardingComplete: row.onboardingComplete === 1,
    isPremium: row.isPremium === 1,
    darkMode: row.darkMode as UserPreferences['darkMode'],
    textSize: row.textSize as UserPreferences['textSize'],
    notificationsEnabled: row.notificationsEnabled === 1,
    notificationTime: row.notificationTime,
    firstLaunchDate: row.firstLaunchDate,
    lastCRESTDate: row.lastCRESTDate,
    week4Prompted: row.week4Prompted === 1,
    week8Prompted: row.week8Prompted === 1,
    matchedPitchHz: row.matchedPitchHz ?? null,
  };
}

export function getPreferences(): UserPreferences {
  if (!isNativePlatform()) return { ...DEFAULT_PREFERENCES };
  const db = getDb();
  const row = db.getFirstSync<PreferencesRow>('SELECT * FROM preferences WHERE id = 1');
  if (!row) {
    return DEFAULT_PREFERENCES;
  }
  return rowToPreferences(row);
}

export function savePreferences(prefs: UserPreferences): void {
  if (!isNativePlatform()) return;
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO preferences (
      id, onboardingComplete, isPremium, darkMode, textSize,
      notificationsEnabled, notificationTime, firstLaunchDate,
      lastCRESTDate, week4Prompted, week8Prompted, matchedPitchHz
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prefs.onboardingComplete ? 1 : 0,
      prefs.isPremium ? 1 : 0,
      prefs.darkMode,
      prefs.textSize,
      prefs.notificationsEnabled ? 1 : 0,
      prefs.notificationTime,
      prefs.firstLaunchDate,
      prefs.lastCRESTDate,
      prefs.week4Prompted ? 1 : 0,
      prefs.week8Prompted ? 1 : 0,
      prefs.matchedPitchHz,
    ]
  );
}

export function updatePreferences(patch: Partial<UserPreferences>): void {
  if (!isNativePlatform()) return;
  const current = getPreferences();
  savePreferences({ ...current, ...patch });
}
