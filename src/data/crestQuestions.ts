// CREST scale — Compact Rating and Experience of Symptoms in Tinnitus
// All 12 questions, grouped into 6 domains of 2 questions each.
// Developed in-house by Michael McDonald BSc (Hons), AAudA.

export type CRESTDomain =
  | 'intrusion'
  | 'emotional'
  | 'cognitive'
  | 'sleep'
  | 'social'
  | 'control';

export type CRESTQuestion = {
  number: number;       // 1–12
  domain: CRESTDomain;
  text: string;
};

// 5-point response scale used for every question
export const RESPONSE_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Occasionally' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Almost always' },
];

export const CREST_QUESTIONS: readonly CRESTQuestion[] = [
  // — Intrusion —
  {
    number: 1,
    domain: 'intrusion',
    text: 'Over the past week, how often was your tinnitus hard to ignore?',
  },
  {
    number: 2,
    domain: 'intrusion',
    text: 'Over the past week, how often did tinnitus pull your attention away from what you were doing?',
  },
  // — Emotional —
  {
    number: 3,
    domain: 'emotional',
    text: 'Over the past week, how often did your tinnitus make you feel anxious or on edge?',
  },
  {
    number: 4,
    domain: 'emotional',
    text: 'Over the past week, how often did tinnitus leave you feeling frustrated or low?',
  },
  // — Cognitive —
  {
    number: 5,
    domain: 'cognitive',
    text: 'Over the past week, how often did tinnitus make it harder to concentrate?',
  },
  {
    number: 6,
    domain: 'cognitive',
    text: 'Over the past week, how often did tinnitus make it difficult to follow a conversation?',
  },
  // — Sleep —
  {
    number: 7,
    domain: 'sleep',
    text: 'Over the past week, how often did tinnitus make it harder to fall asleep?',
  },
  {
    number: 8,
    domain: 'sleep',
    text: 'Over the past week, how often did tinnitus disturb your sleep during the night?',
  },
  // — Social —
  {
    number: 9,
    domain: 'social',
    text: 'Over the past week, how often did tinnitus get in the way of things you wanted to do?',
  },
  {
    number: 10,
    domain: 'social',
    text: 'Over the past week, how often did tinnitus affect your enjoyment of time with others?',
  },
  // — Control —
  {
    number: 11,
    domain: 'control',
    text: 'Over the past week, how often did tinnitus feel overwhelming or hard to manage?',
  },
  {
    number: 12,
    domain: 'control',
    text: 'Over the past week, how often did you feel like tinnitus was in control rather than you?',
  },
];
