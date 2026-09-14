// Daily streak calculation — pure logic extracted from app/(tabs)/index.tsx
// so it can be unit tested without a real SQLite database or React tree.
//
// A "streak" is the number of consecutive calendar days (UTC, since dates are
// stored as ISO strings) on which the user did at least one of: saved a
// symptom log, or completed a sound session. The two sources are merged into
// a single set of "active" date keys (YYYY-MM-DD) before this function ever
// sees them — see computeStreak() in app/(tabs)/index.tsx for the DB query
// that builds that list.
//
// A day with no activity is not immediately fatal to today's streak: if the
// user hasn't logged anything yet today, we count from yesterday backwards
// instead of zeroing out — see the `startOffset` logic below.

const DAY_MS = 86400000;

export function toDateKey(ms: number): string {
  return new Date(ms).toISOString().substring(0, 10);
}

export function computeStreakFromDates(activeDates: string[], now: number = Date.now()): number {
  const active = new Set(activeDates);
  if (active.size === 0) return 0;

  const today = toDateKey(now);
  const yesterday = toDateKey(now - DAY_MS);

  // Don't penalise users who haven't logged yet today — carry the streak
  // from yesterday if today has no entry yet.
  const startOffset = active.has(today) ? 0 : active.has(yesterday) ? 1 : -1;
  if (startOffset === -1) return 0;

  let count = 0;
  for (let i = startOffset; i < 366; i++) {
    if (active.has(toDateKey(now - i * DAY_MS))) {
      count++;
    } else {
      break;
    }
  }
  return count;
}
