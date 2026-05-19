import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web');
  }
  if (!_db) {
    _db = SQLite.openDatabaseSync('hush.db');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      onboardingComplete INTEGER NOT NULL DEFAULT 0,
      isPremium INTEGER NOT NULL DEFAULT 0,
      darkMode TEXT NOT NULL DEFAULT 'system',
      textSize TEXT NOT NULL DEFAULT 'medium',
      notificationsEnabled INTEGER NOT NULL DEFAULT 0,
      notificationTime TEXT NOT NULL DEFAULT '09:00',
      firstLaunchDate TEXT NOT NULL DEFAULT '',
      lastTFIDate TEXT,
      week4Prompted INTEGER NOT NULL DEFAULT 0,
      week8Prompted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tfi_assessments (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      totalScore REAL NOT NULL,
      grade TEXT NOT NULL,
      subscalesJson TEXT NOT NULL,
      responsesJson TEXT NOT NULL,
      isBaseline INTEGER NOT NULL DEFAULT 1,
      weekNumber INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tfi_draft (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      responsesJson TEXT NOT NULL,
      currentIndex INTEGER NOT NULL DEFAULT 0,
      savedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sound_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      soundsJson TEXT NOT NULL,
      durationSeconds INTEGER NOT NULL,
      timerMinutes INTEGER NOT NULL DEFAULT 0,
      volume REAL NOT NULL DEFAULT 0.7,
      balance REAL NOT NULL DEFAULT 0,
      notchedFrequency REAL
    );
  `);
}
