import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function isNativePlatform(): boolean {
  return Platform.OS !== 'web';
}

export function getDb(): SQLite.SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web');
  }
  if (!_db) {
    _db = SQLite.openDatabaseSync('hush.db');
    runMigrations(_db);
  }
  return _db;
}

// ─── Schema migrations ────────────────────────────────────────────────────────
//
// Schema version is tracked in SQLite's built-in `PRAGMA user_version`, an
// integer stored in the database file itself (0 for a brand-new file). On
// every launch, getDb() compares that stored version against MIGRATIONS below
// and runs — in order, each in its own transaction — only the migrations
// whose `version` is higher than what's already been applied. Every
// migration is additive only: CREATE TABLE IF NOT EXISTS for new tables, or
// ALTER TABLE ... ADD COLUMN with a safe default for new columns on existing
// tables. None of them ever DROP a table or DELETE rows, so upgrading the app
// never loses a user's CREST scores, symptom logs, or sound sessions.
//
// HOW TO ADD A FUTURE MIGRATION:
//   1. Add a new entry to MIGRATIONS with the next sequential `version`
//      number (do not reuse or reorder existing version numbers).
//   2. Its `up(db)` should only add columns/tables:
//        db.execSync("ALTER TABLE preferences ADD COLUMN foo TEXT DEFAULT 'bar'");
//        db.execSync('CREATE TABLE IF NOT EXISTS new_thing (...)');
//   3. SQLite has no "ADD COLUMN IF NOT EXISTS" — wrap ALTER TABLE calls in
//      try/catch and swallow the error. That error ("duplicate column name")
//      only happens if this exact migration's version was already recorded
//      as applied but somehow ran again (e.g. the app was killed after the
//      ALTER succeeded but before user_version was persisted) — safe to
//      ignore, never a sign of a different problem.
//   4. Never edit a migration that has already shipped — devices in the wild
//      may already have it recorded as applied, and its code won't run again
//      for them. Make behaviour changes with a new, higher-numbered
//      migration instead.
//   5. Never add a DROP TABLE / DELETE FROM to a migration. If a table or
//      column is genuinely no longer needed, leave it in place unused rather
//      than risk deleting a user's data — SQLite doesn't charge meaningfully
//      for a handful of unused columns.

type Migration = {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => void;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Baseline schema — every table through the CREST relaunch.',
    up: (db) => {
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
          lastCRESTDate TEXT,
          week4Prompted INTEGER NOT NULL DEFAULT 0,
          week8Prompted INTEGER NOT NULL DEFAULT 0,
          matchedPitchHz REAL
        );

        CREATE TABLE IF NOT EXISTS crest_assessments (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          totalScore REAL NOT NULL,
          severity TEXT NOT NULL,
          domainsJson TEXT NOT NULL,
          responsesJson TEXT NOT NULL,
          isBaseline INTEGER NOT NULL DEFAULT 1,
          weekNumber INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS crest_draft (
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

        -- Phase 5: sleep hygiene checklist persistence
        CREATE TABLE IF NOT EXISTS sleep_hygiene_checks (
          id TEXT PRIMARY KEY,
          checked INTEGER NOT NULL DEFAULT 0,
          updatedAt TEXT NOT NULL DEFAULT ''
        );

        -- Phase 5 / Phase 6: symptom log
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

      // Installs that existed before `preferences` included these columns in
      // its CREATE TABLE get them added here; installs created fresh from
      // the CREATE TABLE above already have them, so these throw "duplicate
      // column name" there — the expected, harmless case.
      const legacyAlters = [
        'ALTER TABLE preferences ADD COLUMN matchedPitchHz REAL',
        'ALTER TABLE preferences ADD COLUMN lastCRESTDate TEXT',
      ];
      for (const sql of legacyAlters) {
        try { db.execSync(sql); } catch { /* column already exists */ }
      }

      // The CREST scale replaced the TFI scale: different question count,
      // response scale, scoring formula, and domain structure, so prior TFI
      // rows can't be meaningfully converted into CREST records. This is the
      // one deliberate, already-shipped exception to "never drop data" this
      // schema has ever had — IF EXISTS makes it a safe no-op on every
      // install from here on (either it already ran once, or the install is
      // new enough to never have had these tables at all).
      try { db.execSync('DROP TABLE IF EXISTS tfi_assessments'); } catch { /* table absent */ }
      try { db.execSync('DROP TABLE IF EXISTS tfi_draft'); } catch { /* table absent */ }
    },
  },

  // ─── Add future migrations below, each with the next sequential version ───
  // {
  //   version: 2,
  //   description: 'Add reminderSnoozedUntil to preferences.',
  //   up: (db) => {
  //     try {
  //       db.execSync("ALTER TABLE preferences ADD COLUMN reminderSnoozedUntil TEXT DEFAULT NULL");
  //     } catch { /* already applied */ }
  //   },
  // },
];

function getSchemaVersion(db: SQLite.SQLiteDatabase): number {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

function setSchemaVersion(db: SQLite.SQLiteDatabase, version: number): void {
  // PRAGMA does not accept bound parameters. `version` is always one of our
  // own integer literals from MIGRATIONS above, never user input, so string
  // interpolation here is safe.
  db.execSync(`PRAGMA user_version = ${version}`);
}

function runMigrations(db: SQLite.SQLiteDatabase): void {
  const currentVersion = getSchemaVersion(db);
  const pending = MIGRATIONS
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    // Auto commit/rollback: if `up` throws partway through, none of its
    // statements are kept and user_version is not advanced, so the same
    // migration is retried in full on the next launch instead of leaving the
    // schema half-upgraded.
    db.withTransactionSync(() => {
      migration.up(db);
      setSchemaVersion(db, migration.version);
    });
  }
}
