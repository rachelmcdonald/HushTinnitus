import { Platform } from 'react-native';
import { SymptomLog, TriggerTag } from '@/src/types';
import { getDb } from './database';

function makeId(): string {
  return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function mapRow(r: {
  id: string; date: string; timeOfDay: string;
  loudness: number; distress: number; notes: string; triggersJson: string;
}): SymptomLog {
  return {
    id: r.id,
    date: r.date,
    timeOfDay: r.timeOfDay as SymptomLog['timeOfDay'],
    loudness: r.loudness,
    distress: r.distress,
    notes: r.notes,
    triggers: JSON.parse(r.triggersJson) as TriggerTag[],
  };
}

type RowShape = {
  id: string; date: string; timeOfDay: string;
  loudness: number; distress: number; notes: string; triggersJson: string;
};

export function saveSymptomLog(entry: Omit<SymptomLog, 'id'>): SymptomLog {
  if (Platform.OS === 'web') return { id: `web_${Date.now()}`, ...entry };
  const id = makeId();
  getDb().runSync(
    `INSERT INTO symptom_log (id, date, timeOfDay, loudness, distress, notes, triggersJson)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, entry.date, entry.timeOfDay, entry.loudness, entry.distress, entry.notes, JSON.stringify(entry.triggers)]
  );
  return { id, ...entry };
}

export function getRecentLogs(limit = 30): SymptomLog[] {
  if (Platform.OS === 'web') return [];
  return getDb()
    .getAllSync<RowShape>('SELECT * FROM symptom_log ORDER BY date DESC LIMIT ?', [limit])
    .map(mapRow);
}

export function getLogsForPeriod(days: number): SymptomLog[] {
  if (Platform.OS === 'web') return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return getDb()
    .getAllSync<RowShape>('SELECT * FROM symptom_log WHERE date >= ? ORDER BY date ASC', [since])
    .map(mapRow);
}

export function getTodayLogs(): SymptomLog[] {
  if (Platform.OS === 'web') return [];
  const today = new Date().toISOString().substring(0, 10);
  return getDb()
    .getAllSync<RowShape>(
      `SELECT * FROM symptom_log WHERE date >= ? ORDER BY date DESC`,
      [`${today}T00:00:00.000Z`]
    )
    .map(mapRow);
}

// Trigger pattern analysis: avg distress per tag, across last 100 entries
export type TriggerStat = { tag: TriggerTag; avgDistress: number; count: number };

export function getTriggerStats(): TriggerStat[] {
  const logs = getRecentLogs(100);
  const ALL_TAGS: TriggerTag[] = ['noise', 'stress', 'caffeine', 'alcohol', 'poor-sleep', 'illness', 'other'];
  const statMap = new Map<TriggerTag, { total: number; count: number }>();
  for (const tag of ALL_TAGS) statMap.set(tag, { total: 0, count: 0 });

  for (const log of logs) {
    for (const tag of log.triggers) {
      const s = statMap.get(tag);
      if (s) { s.total += log.distress; s.count += 1; }
    }
  }

  return ALL_TAGS
    .map(tag => {
      const s = statMap.get(tag)!;
      return { tag, avgDistress: s.count > 0 ? +(s.total / s.count).toFixed(1) : 0, count: s.count };
    })
    .filter(s => s.count > 0)
    .sort((a, b) => b.avgDistress - a.avgDistress);
}

// Session counter — reads from sound_sessions table
export type SessionStats = { totalSessions: number; totalMinutes: number };

export function getSessionStats(): SessionStats {
  if (Platform.OS === 'web') return { totalSessions: 0, totalMinutes: 0 };
  const row = getDb().getFirstSync<{ totalSessions: number; totalSeconds: number }>(
    `SELECT COUNT(*) as totalSessions, COALESCE(SUM(durationSeconds), 0) as totalSeconds
     FROM sound_sessions`
  );
  return {
    totalSessions: row?.totalSessions ?? 0,
    totalMinutes: Math.round((row?.totalSeconds ?? 0) / 60),
  };
}

// Group logs by UTC date (YYYY-MM-DD), averaging values per day
export function groupLogsByDay(
  logs: SymptomLog[]
): Array<{ loudness: number; distress: number }> {
  const byDay = new Map<string, { lSum: number; dSum: number; count: number }>();
  for (const log of logs) {
    const day = log.date.substring(0, 10);
    const existing = byDay.get(day) ?? { lSum: 0, dSum: 0, count: 0 };
    existing.lSum += log.loudness;
    existing.dSum += log.distress;
    existing.count += 1;
    byDay.set(day, existing);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({
      loudness: +(v.lSum / v.count).toFixed(1),
      distress: +(v.dSum / v.count).toFixed(1),
    }));
}
