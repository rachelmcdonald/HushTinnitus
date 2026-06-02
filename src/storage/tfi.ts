import { TFIAssessment } from '@/src/types';
import { getDb, isNativePlatform } from './database';

// ─── Draft (in-progress questionnaire) ───────────────────────────────────────

export type TFIDraft = {
  responses: number[];    // 25 values, default 5 for unanswered
  currentIndex: number;
  savedAt: string;
};

const DRAFT_DEFAULTS: number[] = Array(25).fill(5);

export function loadDraft(): TFIDraft | null {
  if (!isNativePlatform()) return null;
  const db = getDb();
  const row = db.getFirstSync<{
    responsesJson: string;
    currentIndex: number;
    savedAt: string;
  }>('SELECT responsesJson, currentIndex, savedAt FROM tfi_draft WHERE id = 1');

  if (!row) return null;
  return {
    responses: JSON.parse(row.responsesJson),
    currentIndex: row.currentIndex,
    savedAt: row.savedAt,
  };
}

export function saveDraft(responses: number[], currentIndex: number): void {
  if (!isNativePlatform()) return;
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO tfi_draft (id, responsesJson, currentIndex, savedAt)
     VALUES (1, ?, ?, ?)`,
    [JSON.stringify(responses), currentIndex, new Date().toISOString()]
  );
}

export function clearDraft(): void {
  if (!isNativePlatform()) return;
  const db = getDb();
  db.runSync('DELETE FROM tfi_draft WHERE id = 1');
}

export function getInitialDraftState(): { responses: number[]; currentIndex: number } {
  const draft = loadDraft();
  return {
    responses: draft?.responses ?? [...DRAFT_DEFAULTS],
    currentIndex: draft?.currentIndex ?? 0,
  };
}

// ─── Completed assessments ────────────────────────────────────────────────────

function makeId(): string {
  return `tfi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveTFIAssessment(assessment: TFIAssessment): void {
  if (!isNativePlatform()) return;
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO tfi_assessments
       (id, date, totalScore, grade, subscalesJson, responsesJson, isBaseline, weekNumber)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assessment.id,
      assessment.date,
      assessment.totalScore,
      assessment.grade,
      JSON.stringify(assessment.subscales),
      JSON.stringify(assessment.responses),
      assessment.isBaseline ? 1 : 0,
      assessment.weekNumber,
    ]
  );
}

export function buildAndSaveAssessment(
  responses: number[],
  score: ReturnType<typeof import('@/src/utils/tfiScoring').scoreTFI>,
  isBaseline: boolean,
  weekNumber: number
): TFIAssessment {
  const assessment: TFIAssessment = {
    id: makeId(),
    date: new Date().toISOString(),
    totalScore: score.totalScore,
    grade: score.grade,
    subscales: score.subscales,
    responses,
    isBaseline,
    weekNumber,
  };
  if (isNativePlatform()) saveTFIAssessment(assessment);
  return assessment;
}

export function getAssessmentById(id: string): TFIAssessment | null {
  if (!isNativePlatform()) return null;
  const db = getDb();
  const row = db.getFirstSync<{
    id: string;
    date: string;
    totalScore: number;
    grade: string;
    subscalesJson: string;
    responsesJson: string;
    isBaseline: number;
    weekNumber: number;
  }>('SELECT * FROM tfi_assessments WHERE id = ?', [id]);

  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    totalScore: row.totalScore,
    grade: row.grade as TFIAssessment['grade'],
    subscales: JSON.parse(row.subscalesJson),
    responses: JSON.parse(row.responsesJson),
    isBaseline: row.isBaseline === 1,
    weekNumber: row.weekNumber,
  };
}

export function getAllAssessments(): TFIAssessment[] {
  if (!isNativePlatform()) return [];
  const db = getDb();
  const rows = db.getAllSync<{
    id: string;
    date: string;
    totalScore: number;
    grade: string;
    subscalesJson: string;
    responsesJson: string;
    isBaseline: number;
    weekNumber: number;
  }>('SELECT * FROM tfi_assessments ORDER BY date ASC');

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    totalScore: row.totalScore,
    grade: row.grade as TFIAssessment['grade'],
    subscales: JSON.parse(row.subscalesJson),
    responses: JSON.parse(row.responsesJson),
    isBaseline: row.isBaseline === 1,
    weekNumber: row.weekNumber,
  }));
}

export function getLatestAssessment(): TFIAssessment | null {
  if (!isNativePlatform()) return null;
  const db = getDb();
  const row = db.getFirstSync<{
    id: string;
    date: string;
    totalScore: number;
    grade: string;
    subscalesJson: string;
    responsesJson: string;
    isBaseline: number;
    weekNumber: number;
  }>('SELECT * FROM tfi_assessments ORDER BY date DESC LIMIT 1');

  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    totalScore: row.totalScore,
    grade: row.grade as TFIAssessment['grade'],
    subscales: JSON.parse(row.subscalesJson),
    responses: JSON.parse(row.responsesJson),
    isBaseline: row.isBaseline === 1,
    weekNumber: row.weekNumber,
  };
}
