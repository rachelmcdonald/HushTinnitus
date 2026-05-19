// TFI scoring — Section 6 of spec
// Source: Meikle MB et al. (2012). Ear and Hearing, 33(2), 153–176.
//
// Total score formula: the spec states "multiply by 2.5" but that produces a
// max of 625, not 100. The correct formula from the original paper is:
//   total = sum / 2.5  (i.e. divide by 2.5, or multiply by 0.4)
//   which maps 0–250 → 0–100.
//
// Q1 and Q2: a response of 0 is excluded from the sum per spec Section 6.
// Subscales (3 items): score = (sum / 3) × 10  →  0–100
// Emotional (4 items):  score = (sum / 4) × 10  →  0–100
// MCID = 13 points.

import { TFIAssessment } from '@/src/types';

export type TFIGrade = TFIAssessment['grade'];

export function gradeFromScore(score: number): TFIGrade {
  if (score <= 17) return 'not-significant';
  if (score <= 31) return 'small';
  if (score <= 53) return 'moderate';
  if (score <= 72) return 'big';
  return 'very-big';
}

function subscaleScore(items: number[]): number {
  const sum = items.reduce((a, b) => a + b, 0);
  return (sum / items.length) * 10;
}

export function scoreTFI(responses: number[]): {
  totalScore: number;
  grade: TFIGrade;
  subscales: TFIAssessment['subscales'];
} {
  if (responses.length !== 25) {
    throw new Error(`Expected 25 responses, got ${responses.length}`);
  }

  // Q1 (index 0) and Q2 (index 1): response of 0 excluded from total sum
  const scoredResponses = responses.map((r, i) => {
    if ((i === 0 || i === 1) && r === 0) return 0; // excluded = contributes 0
    return r;
  });

  // Total: sum of scored responses / 2.5  →  0–100
  const sum = scoredResponses.reduce((a, b) => a + b, 0);
  const totalScore = Math.round((sum / 2.5) * 10) / 10;

  // Subscales (all use 0-indexed response array)
  const subscales: TFIAssessment['subscales'] = {
    intrusiveness: Math.round(subscaleScore(scoredResponses.slice(0, 3)) * 10) / 10,
    control:       Math.round(subscaleScore(scoredResponses.slice(3, 6)) * 10) / 10,
    cognitive:     Math.round(subscaleScore(scoredResponses.slice(6, 9)) * 10) / 10,
    sleep:         Math.round(subscaleScore(scoredResponses.slice(9, 12)) * 10) / 10,
    auditory:      Math.round(subscaleScore(scoredResponses.slice(12, 15)) * 10) / 10,
    relaxation:    Math.round(subscaleScore(scoredResponses.slice(15, 18)) * 10) / 10,
    qualityOfLife: Math.round(subscaleScore(scoredResponses.slice(18, 21)) * 10) / 10,
    emotional:     Math.round(subscaleScore(scoredResponses.slice(21, 25)) * 10) / 10,
  };

  return { totalScore, grade: gradeFromScore(totalScore), subscales };
}
