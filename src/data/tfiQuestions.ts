// Section 6 — Tinnitus Functional Index, all 25 questions
// Source: Meikle MB et al. (2012). Ear and Hearing, 33(2), 153–176.

export type TFISubscale =
  | 'Intrusiveness'
  | 'Sense of control'
  | 'Cognitive'
  | 'Sleep'
  | 'Auditory'
  | 'Relaxation'
  | 'Quality of life'
  | 'Emotional';

export type TFIQuestion = {
  number: number;       // 1–25
  subscale: TFISubscale;
  text: string;
  anchorLow: string;    // label at 0
  anchorHigh: string;   // label at 10
  excludeZero: boolean; // Q1 and Q2 only — 0 response not included in score
};

export const TFI_QUESTIONS: readonly TFIQuestion[] = [
  // — Intrusiveness —
  {
    number: 1,
    subscale: 'Intrusiveness',
    text: 'Over the past week, what percentage of time were you consciously aware of your tinnitus?',
    anchorLow: '0%',
    anchorHigh: '100%',
    excludeZero: true,
  },
  {
    number: 2,
    subscale: 'Intrusiveness',
    text: 'Over the past week, how strong or loud did your tinnitus seem?',
    anchorLow: 'Not at all strong',
    anchorHigh: 'Extremely strong',
    excludeZero: true,
  },
  {
    number: 3,
    subscale: 'Intrusiveness',
    text: 'Over the past week, what percentage of time did you feel unable to ignore your tinnitus?',
    anchorLow: '0%',
    anchorHigh: '100%',
    excludeZero: false,
  },
  // — Sense of control —
  {
    number: 4,
    subscale: 'Sense of control',
    text: 'Over the past week, how difficult was it to cope with your tinnitus?',
    anchorLow: 'Not difficult',
    anchorHigh: 'Extremely difficult',
    excludeZero: false,
  },
  {
    number: 5,
    subscale: 'Sense of control',
    text: 'Over the past week, how much did tinnitus interfere with your enjoyment of life?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 6,
    subscale: 'Sense of control',
    text: 'Over the past week, how much did tinnitus interfere with your social activities?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  // — Cognitive —
  {
    number: 7,
    subscale: 'Cognitive',
    text: 'Over the past week, how much did tinnitus interfere with your ability to think clearly?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 8,
    subscale: 'Cognitive',
    text: 'Over the past week, how much did tinnitus interfere with your ability to concentrate?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 9,
    subscale: 'Cognitive',
    text: 'Over the past week, how much tinnitus-related distress did you experience?',
    anchorLow: 'No distress',
    anchorHigh: 'Extreme distress',
    excludeZero: false,
  },
  // — Sleep —
  {
    number: 10,
    subscale: 'Sleep',
    text: 'Over the past week, how often did tinnitus keep you from falling asleep?',
    anchorLow: 'Never',
    anchorHigh: 'Always',
    excludeZero: false,
  },
  {
    number: 11,
    subscale: 'Sleep',
    text: 'Over the past week, how often did tinnitus cause you to wake during the night?',
    anchorLow: 'Never',
    anchorHigh: 'Always',
    excludeZero: false,
  },
  {
    number: 12,
    subscale: 'Sleep',
    text: 'Over the past week, how much did tinnitus interfere with your getting enough sleep?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  // — Auditory —
  {
    number: 13,
    subscale: 'Auditory',
    text: 'Over the past week, how much did tinnitus interfere with your ability to hear clearly?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 14,
    subscale: 'Auditory',
    text: 'Over the past week, how much did tinnitus make it difficult to understand people who were speaking?',
    anchorLow: 'Not difficult',
    anchorHigh: 'Extremely difficult',
    excludeZero: false,
  },
  {
    number: 15,
    subscale: 'Auditory',
    text: 'Over the past week, how much did tinnitus make it difficult for you to follow conversations in a group?',
    anchorLow: 'Not difficult',
    anchorHigh: 'Extremely difficult',
    excludeZero: false,
  },
  // — Relaxation —
  {
    number: 16,
    subscale: 'Relaxation',
    text: 'Over the past week, how much did tinnitus interfere with your ability to relax?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 17,
    subscale: 'Relaxation',
    text: 'Over the past week, how much did tinnitus interfere with your ability to rest or recuperate?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 18,
    subscale: 'Relaxation',
    text: 'Over the past week, how much did tinnitus interfere with your ability to engage in quiet activities?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  // — Quality of life —
  {
    number: 19,
    subscale: 'Quality of life',
    text: 'Over the past week, how much did tinnitus interfere with your quality of life?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  {
    number: 20,
    subscale: 'Quality of life',
    text: 'Over the past week, how much did your tinnitus contribute to unhappiness?',
    anchorLow: 'Did not contribute',
    anchorHigh: 'Contributed greatly',
    excludeZero: false,
  },
  {
    number: 21,
    subscale: 'Quality of life',
    text: 'Over the past week, how much did tinnitus interfere with your work or household responsibilities?',
    anchorLow: 'Did not interfere',
    anchorHigh: 'Completely interfered',
    excludeZero: false,
  },
  // — Emotional —
  {
    number: 22,
    subscale: 'Emotional',
    text: 'Over the past week, how anxious or worried did your tinnitus make you feel?',
    anchorLow: 'Not anxious',
    anchorHigh: 'Extremely anxious',
    excludeZero: false,
  },
  {
    number: 23,
    subscale: 'Emotional',
    text: 'Over the past week, how bothered or annoyed were you by your tinnitus?',
    anchorLow: 'Not bothered',
    anchorHigh: 'Extremely bothered',
    excludeZero: false,
  },
  {
    number: 24,
    subscale: 'Emotional',
    text: 'How depressed did your tinnitus make you feel over the past week?',
    anchorLow: 'Not depressed',
    anchorHigh: 'Extremely depressed',
    excludeZero: false,
  },
  {
    number: 25,
    subscale: 'Emotional',
    text: 'How much did tinnitus make you feel frustrated over the past week?',
    anchorLow: 'Not frustrated',
    anchorHigh: 'Extremely frustrated',
    excludeZero: false,
  },
];
