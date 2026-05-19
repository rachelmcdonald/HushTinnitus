import { SoundSession } from '@/src/types';
import { getDb } from './database';

function makeId(): string {
  return `ss_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createSessionId(): string {
  return makeId();
}

export function saveSoundSession(session: SoundSession): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO sound_sessions
       (id, date, soundsJson, durationSeconds, timerMinutes, volume, balance, notchedFrequency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.date,
      JSON.stringify(session.sounds),
      session.durationSeconds,
      session.timerMinutes,
      session.volume,
      session.balance,
      session.notchedFrequency,
    ]
  );
}

export function getRecentSessions(limit = 20): SoundSession[] {
  const db = getDb();
  const rows = db.getAllSync<{
    id: string;
    date: string;
    soundsJson: string;
    durationSeconds: number;
    timerMinutes: number;
    volume: number;
    balance: number;
    notchedFrequency: number | null;
  }>('SELECT * FROM sound_sessions ORDER BY date DESC LIMIT ?', [limit]);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    sounds: JSON.parse(r.soundsJson),
    durationSeconds: r.durationSeconds,
    timerMinutes: r.timerMinutes,
    volume: r.volume,
    balance: r.balance,
    notchedFrequency: r.notchedFrequency,
  }));
}
