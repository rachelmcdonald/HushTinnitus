// Section 9 — Core data models (stored on-device via expo-sqlite)

export interface CRESTAssessment {
  id: string;
  date: string;
  totalScore: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'significant' | 'severe';
  domains: {
    intrusion: number;
    emotional: number;
    cognitive: number;
    sleep: number;
    social: number;
    control: number;
  };
  responses: number[];
  isBaseline: boolean;
  weekNumber: number;
}

export interface SymptomLog {
  id: string;
  date: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  loudness: number;
  distress: number;
  notes: string;
  triggers: Array<'noise' | 'stress' | 'caffeine' | 'alcohol' | 'poor-sleep' | 'illness' | 'other'>;
}

export interface SoundSession {
  id: string;
  date: string;
  sounds: string[];
  durationSeconds: number;
  timerMinutes: number;
  volume: number;
  balance: number;
  notchedFrequency: number | null;
}

export interface UserPreferences {
  onboardingComplete: boolean;
  isPremium: boolean;
  darkMode: 'system' | 'light' | 'dark';
  textSize: 'small' | 'medium' | 'large';
  notificationsEnabled: boolean;
  notificationTime: string;
  firstLaunchDate: string;
  lastCRESTDate: string | null;
  week4Prompted: boolean;
  week8Prompted: boolean;
  matchedPitchHz: number | null;
}

// CREST severity grade type
export type CRESTSeverity = CRESTAssessment['severity'];

// Trigger tag type
export type TriggerTag = SymptomLog['triggers'][number];

// Sound source identifiers
export type SoundSource =
  | 'white-noise'
  | 'pink-noise'
  | 'brown-noise'
  | 'rain'
  | 'ocean'
  | 'stream'
  | 'forest'
  | 'fire'
  | 'cafe'
  | 'binaural-alpha'
  | 'binaural-theta';
