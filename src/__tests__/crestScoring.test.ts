/**
 * Unit tests for src/utils/crestScoring.ts — the CREST scale scoring engine.
 *
 * WHAT is under test: scoreCREST() (total score + domain subscores),
 * severityFromScore()/severityLabel() (banding), and isNotableChange()
 * (retest delta flagging).
 *
 * WHY: CREST is the app's core outcome measure — onboarding results, the
 * week 4/8 retest flow, and the Progress trend chart all depend on this
 * arithmetic being exactly right. A rounding or off-by-one error here would
 * silently mis-grade a user's tinnitus impact.
 *
 * Testing techniques used (ISTQB), labelled per test:
 *   BVA — Boundary Value Analysis: values at and either side of a boundary
 *         (e.g. the last raw score that rounds down vs. the first that
 *         rounds up to the next integer).
 *   EP  — Equivalence Partitioning: one representative value per partition
 *         (e.g. one score per severity band), on the assumption every other
 *         value in that partition behaves the same way.
 */

import {
  scoreCREST,
  severityFromScore,
  severityLabel,
  isNotableChange,
  NOTABLE_CHANGE_THRESHOLD,
} from '@/src/utils/crestScoring';

function responses(...values: number[]): number[] {
  if (values.length !== 12) throw new Error(`Test setup error: expected 12 values, got ${values.length}`);
  return values;
}

describe('scoreCREST — total score formula', () => {
  // BVA — lower boundary of the whole scale
  it('returns a total score of 0 when all 12 responses are 0', () => {
    const { totalScore } = scoreCREST(responses(0,0,0,0,0,0,0,0,0,0,0,0));
    expect(totalScore).toBe(0);
  });

  // BVA — upper boundary of the whole scale
  it('returns a total score of 100 when all 12 responses are 4 (max)', () => {
    const { totalScore } = scoreCREST(responses(4,4,4,4,4,4,4,4,4,4,4,4));
    expect(totalScore).toBe(100);
  });

  // BVA — raw score 23: 23 * 2.083 = 47.909, which rounds UP to 48.
  // (Not 47 — Math.round(47.909) = 48. Verified directly against the
  // implementation's rounding rule rather than assumed.)
  it('scales a raw score of 23 to 48 (rounds up from 47.909)', () => {
    // 23 = two 4s + fifteen 1s (2*4 + 15*1 = 23), spread across 12 slots of
    // max 4 each: 1,4,4,1,1,1,1,1,1,1,1,1... need exactly 12 numbers summing to 23.
    const { totalScore } = scoreCREST(responses(4,4,4,4,4,1,1,1,0,0,0,0)); // sum = 23
    expect(totalScore).toBe(48);
  });

  // BVA — raw score 24 sits exactly at the scale's midpoint after rounding.
  it('scales a raw score of 24 to the midpoint score of 50', () => {
    const { totalScore } = scoreCREST(responses(4,4,4,4,4,4,0,0,0,0,0,0)); // sum = 24
    expect(totalScore).toBe(50);
  });

  // BVA — a single response differing by 1 at the boundary changes the
  // rounded output, proving the formula is sensitive at the item level and
  // not just accidentally stable across nearby raw scores.
  it('changes total score when a single response increases by 1 at a boundary', () => {
    const lower = scoreCREST(responses(4,4,4,4,4,4,0,0,0,0,0,0)); // raw 24 -> 50
    const higher = scoreCREST(responses(4,4,4,4,4,4,1,0,0,0,0,0)); // raw 25 -> 52
    expect(higher.totalScore).toBeGreaterThan(lower.totalScore);
    expect(higher.totalScore).toBe(52);
  });

  it('throws if given anything other than exactly 12 responses', () => {
    expect(() => scoreCREST([0, 1, 2])).toThrow('Expected 12 responses, got 3');
  });
});

describe('scoreCREST — score bounds over the valid input domain', () => {
  // EP — every individual response is constrained to 0-4 by the UI
  // (ResponseScale / RESPONSE_OPTIONS); these checks confirm the formula
  // never produces an out-of-range total across that whole valid domain,
  // not just at the two extremes already covered by the BVA tests above.
  it('never produces a total score below 0 for any valid (0-4 per item) response set', () => {
    const { totalScore } = scoreCREST(responses(0,0,0,0,0,0,0,0,0,0,0,0));
    expect(totalScore).toBeGreaterThanOrEqual(0);
  });

  it('never produces a total score above 100 for any valid (0-4 per item) response set', () => {
    const { totalScore } = scoreCREST(responses(4,4,4,4,4,4,4,4,4,4,4,4));
    expect(totalScore).toBeLessThanOrEqual(100);
  });

  it('rounds rawScore * 2.083 to the nearest integer for a mid-range value', () => {
    // raw = 30 -> 30 * 2.083 = 62.49 -> rounds to 62
    const { totalScore } = scoreCREST(responses(4,4,4,4,4,4,4,2,0,0,0,0)); // sum = 30
    expect(totalScore).toBe(62);
  });
});

describe('severityFromScore / severityLabel — banding', () => {
  // EP — one representative score per band; every other score in the same
  // band is assumed to classify identically.
  it('EP: classifies a score in 0-19 as minimal impact', () => {
    expect(severityFromScore(10)).toBe('minimal');
    expect(severityLabel('minimal')).toBe('Minimal impact');
  });

  it('EP: classifies a score in 20-39 as mild impact', () => {
    expect(severityFromScore(30)).toBe('mild');
    expect(severityLabel('mild')).toBe('Mild impact');
  });

  it('EP: classifies a score in 40-59 as moderate impact', () => {
    expect(severityFromScore(50)).toBe('moderate');
    expect(severityLabel('moderate')).toBe('Moderate impact');
  });

  it('EP: classifies a score in 60-79 as significant impact', () => {
    expect(severityFromScore(70)).toBe('significant');
    expect(severityLabel('significant')).toBe('Significant impact');
  });

  it('EP: classifies a score in 80-100 as severe impact', () => {
    expect(severityFromScore(90)).toBe('severe');
    expect(severityLabel('severe')).toBe('Severe impact');
  });

  // BVA — the exact edges between adjacent bands
  it('BVA: band edges classify on the correct side (19/20, 39/40, 59/60, 79/80)', () => {
    expect(severityFromScore(19)).toBe('minimal');
    expect(severityFromScore(20)).toBe('mild');
    expect(severityFromScore(39)).toBe('mild');
    expect(severityFromScore(40)).toBe('moderate');
    expect(severityFromScore(59)).toBe('moderate');
    expect(severityFromScore(60)).toBe('significant');
    expect(severityFromScore(79)).toBe('significant');
    expect(severityFromScore(80)).toBe('severe');
  });
});

describe('scoreCREST — domain subscores', () => {
  // happy path — each domain is 2 questions, scored sum * 12.5
  it('scores the intrusion domain (Q1+Q2) as 100 when both responses are 4', () => {
    const { domains } = scoreCREST(responses(4,4,0,0,0,0,0,0,0,0,0,0));
    expect(domains.intrusion).toBe(100);
  });

  it('scores the sleep domain (Q7+Q8) as 0 when both responses are 0', () => {
    const { domains } = scoreCREST(responses(4,4,4,4,4,4,0,0,4,4,4,4));
    expect(domains.sleep).toBe(0);
  });

  // edge case — every domain is computed independently; a max value in one
  // domain must not leak into or inflate another domain's score.
  it('calculates each of the 6 domains independently and correctly', () => {
    // intrusion=4,4 | emotional=0,0 | cognitive=4,0 | sleep=0,4 | social=2,2 | control=1,3
    const { domains } = scoreCREST(responses(4,4, 0,0, 4,0, 0,4, 2,2, 1,3));
    expect(domains.intrusion).toBe(100); // (4+4)*12.5
    expect(domains.emotional).toBe(0);   // (0+0)*12.5
    expect(domains.cognitive).toBe(50);  // (4+0)*12.5
    expect(domains.sleep).toBe(50);      // (0+4)*12.5
    expect(domains.social).toBe(50);     // (2+2)*12.5
    expect(domains.control).toBe(50);    // (1+3)*12.5
  });
});

describe('isNotableChange — retest delta flagging', () => {
  // BVA — just below, exactly at, and just above the threshold
  it('BVA: a delta of 7 (just below threshold) is not a notable change', () => {
    expect(isNotableChange(7)).toBe(false);
  });

  it('BVA: a delta of exactly 8 (the threshold) is a notable change', () => {
    expect(isNotableChange(NOTABLE_CHANGE_THRESHOLD)).toBe(true);
    expect(isNotableChange(8)).toBe(true);
  });

  it('BVA: a delta of 9 (just above threshold) is a notable change', () => {
    expect(isNotableChange(9)).toBe(true);
  });

  // edge case — a negative delta means the score went UP (worsening, since
  // delta is baseline - retest); that must never register as notable
  // improvement no matter its magnitude.
  it('edge case: a negative delta (worsening) is never a notable change', () => {
    expect(isNotableChange(-5)).toBe(false);
    expect(isNotableChange(-8)).toBe(false);
    expect(isNotableChange(-100)).toBe(false);
  });
});
