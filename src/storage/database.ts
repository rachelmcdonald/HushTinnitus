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
  // Schema migrations — new columns added as ALTER TABLE so existing databases
  // are upgraded in place. Each is wrapped in try/catch: SQLite throws if the
  // column already exists, which is the expected case on subsequent launches.
  const migrations = [
    'ALTER TABLE preferences ADD COLUMN matchedPitchHz REAL',
  ];

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
      week8Prompted INTEGER NOT NULL DEFAULT 0,
      matchedPitchHz REAL
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

  `);

  for (const sql of migrations) {
    try { db.execSync(sql); } catch { /* column already exists */ }
  }

  db.execSync(`
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

    -- Phase 5: sleep hygiene checklist persistence
    CREATE TABLE IF NOT EXISTS sleep_hygiene_checks (
      id TEXT PRIMARY KEY,
      checked INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL DEFAULT ''
    );

    -- Phase 5 / Phase 6: symptom log (UI populated in Phase 6;
    -- sleep hygiene personalisation reads it defensively from Phase 5 onwards)
    CREATE TABLE IF NOT EXISTS symptom_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      timeOfDay TEXT NOT NULL,
      loudness INTEGER NOT NULL,
      distress INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      triggersJson TEXT NOT NULL DEFAULT '[]'
    );

    -- Phase 5: CBT thought journal (Premium)
    CREATE TABLE IF NOT EXISTS thought_journal (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      originalThought TEXT NOT NULL,
      emotion TEXT NOT NULL,
      evidenceFor TEXT NOT NULL DEFAULT '',
      friendPerspective TEXT NOT NULL DEFAULT '',
      balancedView TEXT NOT NULL DEFAULT '',
      reframedThought TEXT NOT NULL,
      completedAt TEXT NOT NULL
    );
  `);
}
