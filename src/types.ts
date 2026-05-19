// Section 9 — Core data models (stored on-device via expo-sqlite)

export interface TFIAssessment {
  id: string;
  date: string;
  totalScore: number;
  grade: 'not-significant' | 'small' | 'moderate' | 'big' | 'very-big';
  subscales: {
    intrusiveness: number;
    control: number;
    cognitive: number;
    sleep: number;
    auditory: number;
    relaxation: number;
    qualityOfLife: number;
    emotional: number;
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
  lastTFIDate: string | null;
  week4Prompted: boolean;
  week8Prompted: boolean;
  matchedPitchHz: number | null;
}

// TFI severity grade type
export type TFIGrade = TFIAssessment['grade'];

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
