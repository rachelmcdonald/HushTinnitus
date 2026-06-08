// CREST scoring — Compact Rating and Experience of Symptoms in Tinnitus
//
// RAW SCORE: sum of all 12 responses (each 0–4)            →  0–48
// TOTAL SCORE: rawScore × 2.083, rounded to nearest whole  →  0–100
// DOMAIN SUBSCORES: each domain = sum of its 2 questions × 12.5  →  0–100
// MEANINGFUL CHANGE THRESHOLD: a drop of 8+ points between assessments
// is flagged as a clinically meaningful improvement (MCID equivalent).

import { CRESTAssessment } from '@/src/types';

export type CRESTSeverity = CRESTAssessment['severity'];

export const MEANINGFUL_CHANGE_THRESHOLD = 8;

const SEVERITY_LABELS: Record<CRESTSeverity, string> = {
  minimal: 'Minimal impact',
  mild: 'Mild impact',
  moderate: 'Moderate impact',
  significant: 'Significant impact',
  severe: 'Severe impact',
};

export function severityFromScore(score: number): CRESTSeverity {
  if (score <= 19) return 'minimal';
  if (score <= 39) return 'mild';
  if (score <= 59) return 'moderate';
  if (score <= 79) return 'significant';
  return 'severe';
}

export function severityLabel(severity: CRESTSeverity): string {
  return SEVERITY_LABELS[severity];
}

function domainScore(items: number[]): number {
  const sum = items.reduce((a, b) => a + b, 0);
  return Math.round(sum * 12.5);
}

export function scoreCREST(responses: number[]): {
  totalScore: number;
  severity: CRESTSeverity;
  domains: CRESTAssessment['domains'];
} {
  if (responses.length !== 12) {
    throw new Error(`Expected 12 responses, got ${responses.length}`);
  }

  const rawScore = responses.reduce((a, b) => a + b, 0);
  const totalScore = Math.round(rawScore * 2.083);

  const domains: CRESTAssessment['domains'] = {
    intrusion: domainScore(responses.slice(0, 2)),
    emotional: domainScore(responses.slice(2, 4)),
    cognitive: domainScore(responses.slice(4, 6)),
    sleep:     domainScore(responses.slice(6, 8)),
    social:    domainScore(responses.slice(8, 10)),
    control:   domainScore(responses.slice(10, 12)),
  };

  return { totalScore, severity: severityFromScore(totalScore), domains };
}

export function isMeaningfulImprovement(delta: number): boolean {
  return delta >= MEANINGFUL_CHANGE_THRESHOLD;
}
