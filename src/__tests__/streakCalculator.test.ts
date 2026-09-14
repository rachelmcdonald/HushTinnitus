/**
 * Unit tests for src/utils/streakCalculator.ts — the daily streak logic
 * shown on the Home tab ("N day streak").
 *
 * WHAT is under test: computeStreakFromDates(), the pure function extracted
 * from app/(tabs)/index.tsx's computeStreak() so it can be tested without a
 * real SQLite database. The DB-facing wrapper in index.tsx just gathers
 * distinct DISTINCT date(YYYY-MM-DD) strings from the symptom_log and
 * sound_sessions tables and passes the merged list in here — so testing
 * this function with a plain string array covers the real logic completely.
 *
 * WHY: streak counting has several easy-to-get-wrong edge cases (today not
 * logged yet, a gap breaking the count, de-duplicating same-day activity
 * from two different sources) that are worth locking down with tests.
 *
 * A fixed reference "now" is passed to every call so tests are deterministic
 * regardless of what day they actually run on.
 *
 * Testing techniques used (ISTQB), labelled per test:
 *   boundary   — edges of the streak window (today missing, exact gap size)
 *   happy path — the straightforward consecutive-days case
 *   edge case  — de-duplication and multi-source merging
 */

import { computeStreakFromDates, toDateKey } from '@/src/utils/streakCalculator';

const DAY = 86400000;
// Fixed reference instant: 2026-06-15T12:00:00.000Z. Using noon avoids any
// ambiguity around midnight rollovers when computing offsets.
const NOW = new Date('2026-06-15T12:00:00.000Z').getTime();

function daysAgo(n: number): string {
  return toDateKey(NOW - n * DAY);
}

describe('computeStreakFromDates', () => {
  // boundary — no activity at all
  it('boundary: returns 0 when there are no active dates', () => {
    expect(computeStreakFromDates([], NOW)).toBe(0);
  });

  // happy path — a single entry logged today
  it('happy path: returns 1 for a single entry logged today', () => {
    expect(computeStreakFromDates([daysAgo(0)], NOW)).toBe(1);
  });

  // happy path — an unbroken run of days including today
  it('happy path: counts an unbroken run of consecutive days including today', () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)];
    expect(computeStreakFromDates(dates, NOW)).toBe(5);
  });

  // boundary — a gap of exactly one day stops the count at the gap, rather
  // than zeroing it out or skipping over the gap
  it('boundary: a one-day gap breaks the streak at the gap, counting only the days before it', () => {
    // today and yesterday present, then a gap at 2 days ago, then more
    // activity even further back — those earlier days must NOT be counted.
    const dates = [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(4)];
    expect(computeStreakFromDates(dates, NOW)).toBe(2);
  });

  // boundary — nothing logged today yet, but yesterday was active: the
  // streak should carry forward from yesterday rather than reset to 0.
  it('boundary: an entry yesterday but not today continues the streak from yesterday', () => {
    const dates = [daysAgo(1), daysAgo(2), daysAgo(3)];
    expect(computeStreakFromDates(dates, NOW)).toBe(3);
  });

  // boundary — nothing today AND nothing yesterday: the streak is broken,
  // even if there's older activity further back.
  it('boundary: no entry today or yesterday resets the streak to 0, regardless of older activity', () => {
    const dates = [daysAgo(2), daysAgo(3), daysAgo(4)];
    expect(computeStreakFromDates(dates, NOW)).toBe(0);
  });

  // edge case — the pure function doesn't know or care which table a date
  // string came from; a caller merging sound-session dates and symptom-log
  // dates into one array is exactly how app/(tabs)/index.tsx uses it.
  it('edge case: counts dates regardless of whether they represent a sound session or a symptom log', () => {
    // Simulates: today's date came from a sound session, yesterday's from a
    // symptom log — merged into one list by the caller, as the real
    // computeStreak() wrapper does.
    const soundSessionDates = [daysAgo(0)];
    const symptomLogDates = [daysAgo(1)];
    const merged = [...soundSessionDates, ...symptomLogDates];
    expect(computeStreakFromDates(merged, NOW)).toBe(2);
  });

  // edge case — logging both a sound session AND a symptom log on the same
  // day must count as ONE streak day, not two entries stretching the streak.
  it('edge case: a sound session and a symptom log on the same day count as one streak day', () => {
    const dates = [daysAgo(0), daysAgo(0), daysAgo(1), daysAgo(1)]; // duplicated per source
    expect(computeStreakFromDates(dates, NOW)).toBe(2); // not 4
  });

  // boundary — the function caps its lookback at 366 days so it can never
  // loop indefinitely against a pathologically long unbroken history.
  it('boundary: a very long unbroken streak is capped at 366 days', () => {
    const dates = Array.from({ length: 400 }, (_, i) => daysAgo(i));
    expect(computeStreakFromDates(dates, NOW)).toBe(366);
  });
});
