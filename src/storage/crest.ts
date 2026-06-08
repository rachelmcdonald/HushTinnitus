import { CRESTAssessment } from '@/src/types';
import { getDb, isNativePlatform } from './database';

// ─── Draft (in-progress questionnaire) ───────────────────────────────────────

export type CRESTDraft = {
  responses: number[];    // 12 values, default 2 ("Sometimes") for unanswered
  currentIndex: number;
  savedAt: string;
};

const DRAFT_DEFAULTS: number[] = Array(12).fill(2);

export function loadDraft(): CRESTDraft | null {
  if (!isNativePlatform()) return null;
  const db = getDb();
  const row = db.getFirstSync<{
    responsesJson: string;
    currentIndex: number;
    savedAt: string;
  }>('SELECT responsesJson, currentIndex, savedAt FROM crest_draft WHERE id = 1');

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
    `INSERT OR REPLACE INTO crest_draft (id, responsesJson, currentIndex, savedAt)
     VALUES (1, ?, ?, ?)`,
    [JSON.stringify(responses), currentIndex, new Date().toISOString()]
  );
}

export function clearDraft(): void {
  if (!isNativePlatform()) return;
  const db = getDb();
  db.runSync('DELETE FROM crest_draft WHERE id = 1');
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
  return `crest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveCRESTAssessment(assessment: CRESTAssessment): void {
  if (!isNativePlatform()) return;
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO crest_assessments
       (id, date, totalScore, severity, domainsJson, responsesJson, isBaseline, weekNumber)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assessment.id,
      assessment.date,
      assessment.totalScore,
      assessment.severity,
      JSON.stringify(assessment.domains),
      JSON.stringify(assessment.responses),
      assessment.isBaseline ? 1 : 0,
      assessment.weekNumber,
    ]
  );
}

export function buildAndSaveAssessment(
  responses: number[],
  score: ReturnType<typeof import('@/src/utils/crestScoring').scoreCREST>,
  isBaseline: boolean,
  weekNumber: number
): CRESTAssessment {
  const assessment: CRESTAssessment = {
    id: makeId(),
    date: new Date().toISOString(),
    totalScore: score.totalScore,
    severity: score.severity,
    domains: score.domains,
    responses,
    isBaseline,
    weekNumber,
  };
  if (isNativePlatform()) saveCRESTAssessment(assessment);
  return assessment;
}

export function getAssessmentById(id: string): CRESTAssessment | null {
  if (!isNativePlatform()) return null;
  const db = getDb();
  const row = db.getFirstSync<{
    id: string;
    date: string;
    totalScore: number;
    severity: string;
    domainsJson: string;
    responsesJson: string;
    isBaseline: number;
    weekNumber: number;
  }>('SELECT * FROM crest_assessments WHERE id = ?', [id]);

  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    totalScore: row.totalScore,
    severity: row.severity as CRESTAssessment['severity'],
    domains: JSON.parse(row.domainsJson),
    responses: JSON.parse(row.responsesJson),
    isBaseline: row.isBaseline === 1,
    weekNumber: row.weekNumber,
  };
}

export function getAllAssessments(): CRESTAssessment[] {
  if (!isNativePlatform()) return [];
  const db = getDb();
  const rows = db.getAllSync<{
    id: string;
    date: string;
    totalScore: number;
    severity: string;
    domainsJson: string;
    responsesJson: string;
    isBaseline: number;
    weekNumber: number;
  }>('SELECT * FROM crest_assessments ORDER BY date ASC');

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    totalScore: row.totalScore,
    severity: row.severity as CRESTAssessment['severity'],
    domains: JSON.parse(row.domainsJson),
    responses: JSON.parse(row.responsesJson),
    isBaseline: row.isBaseline === 1,
    weekNumber: row.weekNumber,
  }));
}

export function getLatestAssessment(): CRESTAssessment | null {
  if (!isNativePlatform()) return null;
  const db = getDb();
  const row = db.getFirstSync<{
    id: string;
    date: string;
    totalScore: number;
    severity: string;
    domainsJson: string;
    responsesJson: string;
    isBaseline: number;
    weekNumber: number;
  }>('SELECT * FROM crest_assessments ORDER BY date DESC LIMIT 1');

  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    totalScore: row.totalScore,
    severity: row.severity as CRESTAssessment['severity'],
    domains: JSON.parse(row.domainsJson),
    responses: JSON.parse(row.responsesJson),
    isBaseline: row.isBaseline === 1,
    weekNumber: row.weekNumber,
  };
}
