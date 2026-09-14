/**
 * Unit tests for the SQLite-backed storage functions in
 * src/storage/symptomLog.ts and src/storage/crest.ts.
 *
 * WHAT is under test: saveSymptomLog / getTodayLogs (symptom log) and
 * saveCRESTAssessment / getLatestAssessment / getAllAssessments (CREST
 * assessments) — the read/write functions the Progress tab and onboarding
 * flow depend on.
 *
 * WHY / HOW `expo-sqlite` is mocked: expo-sqlite's native module doesn't
 * exist under Jest, so the module is mocked at the boundary. Rather than
 * hand-fake query results per SQL string (brittle, and easy to make the
 * mock "pass" without the real query being correct), the mock backs
 * expo-sqlite's sync API (execSync/getFirstSync/getAllSync/runSync/
 * withTransactionSync) with `better-sqlite3`, a real embedded SQL engine.
 * That means the actual schema migrations in src/storage/database.ts and
 * the actual SQL in the storage files run for real against a real
 * in-memory database — only the native binding is swapped out, not the
 * SQL logic itself.
 *
 * DEVIATIONS FROM THE ORIGINAL TEST BRIEF (verified against the real code
 * rather than assumed):
 *   - There is no `getTodaysSymptomLog` function. The real function is
 *     `getTodayLogs()`, which returns an array (possibly empty), not a
 *     single entry or null. Tests below use the real name/shape.
 *   - There is no "one log per day" de-duplication at the storage layer.
 *     `saveSymptomLog` always INSERTs a new row with a fresh id — it never
 *     updates an existing same-day row. This looks intentional rather than
 *     a bug: SymptomLog has a `timeOfDay` field (morning/afternoon/evening/
 *     night), so multiple check-ins per day is plausibly by design. The
 *     test below documents the actual behaviour instead of asserting the
 *     brief's assumed (but incorrect) update-in-place behaviour.
 *   - The real function names are `getLatestAssessment()` and
 *     `getAllAssessments()`, not `getLatestCRESTAssessment` /
 *     `getAllCRESTAssessments`.
 *
 * Testing techniques used (ISTQB), labelled per test:
 *   happy path — normal save/read round trips
 *   edge case  — no data present, multiple same-day entries
 */

import Database from 'better-sqlite3';

// Real Colors/Typography-style approach: back expo-sqlite's sync API with a
// genuine embedded SQL engine so the real migrations/SQL run for real.
const mockRawDb = new Database(':memory:');

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: (sql: string) => {
      mockRawDb.exec(sql);
    },
    getFirstSync: (sql: string, params: unknown[] = []) => {
      const row = mockRawDb.prepare(sql).get(...(params as []));
      return row ?? null;
    },
    getAllSync: (sql: string, params: unknown[] = []) => {
      return mockRawDb.prepare(sql).all(...(params as []));
    },
    runSync: (sql: string, params: unknown[] = []) => {
      return mockRawDb.prepare(sql).run(...(params as []));
    },
    withTransactionSync: (fn: () => void) => {
      mockRawDb.transaction(fn)();
    },
  })),
}));

import { getDb } from '@/src/storage/database';
import { saveSymptomLog, getTodayLogs, getRecentLogs } from '@/src/storage/symptomLog';
import {
  saveCRESTAssessment,
  getAssessmentById,
  getLatestAssessment,
  getAllAssessments,
} from '@/src/storage/crest';
import type { CRESTAssessment, SymptomLog } from '@/src/types';

function makeAssessment(overrides: Partial<CRESTAssessment> = {}): CRESTAssessment {
  return {
    id: `crest_${Math.random().toString(36).slice(2)}`,
    date: '2026-06-01T09:00:00.000Z',
    totalScore: 50,
    severity: 'moderate',
    domains: { intrusion: 50, emotional: 50, cognitive: 50, sleep: 50, social: 50, control: 50 },
    responses: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    isBaseline: true,
    weekNumber: 0,
    ...overrides,
  };
}

function makeSymptomLog(overrides: Partial<Omit<SymptomLog, 'id'>> = {}): Omit<SymptomLog, 'id'> {
  return {
    date: new Date().toISOString(),
    timeOfDay: 'morning',
    loudness: 5,
    distress: 4,
    notes: 'Test entry',
    triggers: ['stress'],
    ...overrides,
  };
}

// Force the schema to exist before any test tries to clear tables.
beforeAll(() => {
  getDb();
});

// Every table starts empty for every test — real data, real isolation.
beforeEach(() => {
  mockRawDb.exec(`
    DELETE FROM symptom_log;
    DELETE FROM crest_assessments;
    DELETE FROM crest_draft;
    DELETE FROM sound_sessions;
  `);
});

// ─── Symptom log ────────────────────────────────────────────────────────────

describe('symptom log storage', () => {
  it('happy path: saveSymptomLog saves all fields correctly', () => {
    const entry = makeSymptomLog({
      date: '2026-06-15T08:00:00.000Z',
      timeOfDay: 'evening',
      loudness: 7,
      distress: 6,
      notes: 'Loud after the concert',
      triggers: ['noise', 'stress'],
    });
    const saved = saveSymptomLog(entry);

    expect(saved.id).toBeTruthy();
    const [stored] = getRecentLogs(1);
    expect(stored).toEqual({
      id: saved.id,
      date: '2026-06-15T08:00:00.000Z',
      timeOfDay: 'evening',
      loudness: 7,
      distress: 6,
      notes: 'Loud after the concert',
      triggers: ['noise', 'stress'],
    });
  });

  it('edge case: getTodayLogs returns an empty array when no entry exists for today', () => {
    // Only a log from a different day is present.
    saveSymptomLog(makeSymptomLog({ date: '2020-01-01T08:00:00.000Z' }));
    expect(getTodayLogs()).toEqual([]);
  });

  it('happy path: getTodayLogs returns the entry when one exists for today', () => {
    const today = new Date().toISOString();
    const saved = saveSymptomLog(makeSymptomLog({ date: today, loudness: 8, distress: 3 }));

    const todayLogs = getTodayLogs();
    expect(todayLogs).toHaveLength(1);
    expect(todayLogs[0].id).toBe(saved.id);
    expect(todayLogs[0].loudness).toBe(8);
  });

  it('edge case: saving a second entry for today adds an additional row rather than updating the first (no per-day dedup at the storage layer)', () => {
    const today = new Date().toISOString();
    saveSymptomLog(makeSymptomLog({ date: today, timeOfDay: 'morning', loudness: 3, distress: 2 }));
    saveSymptomLog(makeSymptomLog({ date: today, timeOfDay: 'night', loudness: 8, distress: 7 }));

    const todayLogs = getTodayLogs();
    expect(todayLogs).toHaveLength(2);
    expect(todayLogs.map((l) => l.timeOfDay).sort()).toEqual(['morning', 'night']);
  });
});

// ─── CREST assessments ──────────────────────────────────────────────────────

describe('CREST assessment storage', () => {
  it('happy path: saveCRESTAssessment stores all 12 responses and the total score', () => {
    const assessment = makeAssessment({
      id: 'crest_fixed_1',
      totalScore: 63,
      responses: [4, 3, 2, 1, 0, 4, 3, 2, 1, 0, 4, 3],
    });
    saveCRESTAssessment(assessment);

    const stored = getAssessmentById('crest_fixed_1');
    expect(stored).not.toBeNull();
    expect(stored!.totalScore).toBe(63);
    expect(stored!.responses).toHaveLength(12);
    expect(stored!.responses).toEqual([4, 3, 2, 1, 0, 4, 3, 2, 1, 0, 4, 3]);
    expect(stored!.domains).toEqual(assessment.domains);
  });

  it('happy path: getLatestAssessment returns the most recently dated assessment', () => {
    saveCRESTAssessment(makeAssessment({ id: 'crest_old', date: '2026-01-01T00:00:00.000Z', totalScore: 70 }));
    saveCRESTAssessment(makeAssessment({ id: 'crest_new', date: '2026-06-01T00:00:00.000Z', totalScore: 40 }));
    saveCRESTAssessment(makeAssessment({ id: 'crest_mid', date: '2026-03-01T00:00:00.000Z', totalScore: 55 }));

    const latest = getLatestAssessment();
    expect(latest?.id).toBe('crest_new');
    expect(latest?.totalScore).toBe(40);
  });

  it('happy path: getAllAssessments returns assessments in chronological order', () => {
    saveCRESTAssessment(makeAssessment({ id: 'crest_c', date: '2026-08-01T00:00:00.000Z' }));
    saveCRESTAssessment(makeAssessment({ id: 'crest_a', date: '2026-01-01T00:00:00.000Z' }));
    saveCRESTAssessment(makeAssessment({ id: 'crest_b', date: '2026-04-01T00:00:00.000Z' }));

    const all = getAllAssessments();
    expect(all.map((a) => a.id)).toEqual(['crest_a', 'crest_b', 'crest_c']);
  });

  it('edge case: getLatestAssessment returns null when no assessments exist', () => {
    expect(getLatestAssessment()).toBeNull();
  });

  it('edge case: getAllAssessments returns an empty array when no assessments exist', () => {
    expect(getAllAssessments()).toEqual([]);
  });
});
