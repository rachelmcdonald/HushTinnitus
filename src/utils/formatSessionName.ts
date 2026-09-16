// Maps the raw session identifiers stored in SoundSession.sounds (the
// sound_sessions.soundsJson column) to user-friendly display names.
//
// These raw values come from two independent call sites, both writing into
// the same generic `sound_sessions` table via saveSoundSession():
//   - src/hooks/useAudioPlayback.ts (Sound tab) — stores the SoundSource id
//     verbatim, e.g. 'white-noise', 'cafe', 'binaural-alpha'.
//   - app/(tabs)/relax/*.tsx (breathing / PMR / body scan / mindfulness /
//     guided imagery / sleep routine) — each stores its own literal string,
//     e.g. 'breathing-478', 'pmr-15min', 'body-scan-10min'.
//
// Keys are matched case-insensitively so 'PMR', 'pmr', and 'Pmr' all resolve
// the same way. Anything not in the table falls back to a generic
// hyphen/underscore-to-space, title-cased humanisation rather than showing
// the raw identifier.
const SESSION_NAMES: Record<string, string> = {
  // Breathing (raw values actually written by the relax screens)
  'breathing-box': 'Box Breathing',
  'box-breathing': 'Box Breathing',
  'box_breathing': 'Box Breathing',

  'breathing-478': '4-7-8 Breathing',
  'breathing_478': '4-7-8 Breathing',

  'breathing-diaphragmatic': 'Diaphragmatic Breathing',
  'diaphragmatic': 'Diaphragmatic Breathing',

  // Relaxation / CBT sessions (Premium)
  'pmr-15min': 'Progressive Muscle Relaxation',
  'pmr': 'Progressive Muscle Relaxation',

  'body-scan-10min': 'Body Scan Meditation',
  'body-scan': 'Body Scan Meditation',
  'body_scan': 'Body Scan Meditation',

  'mindfulness-5min': 'Mindfulness Practice',
  'mindfulness': 'Mindfulness Practice',

  'guided-imagery-beach': 'Guided Imagery',
  'guided-imagery': 'Guided Imagery',

  'sleep-routine': 'Sleep Preparation',

  // Sound tab (SoundSource ids — see src/types.ts)
  'white-noise': 'White Noise',
  'white_noise': 'White Noise',

  'pink-noise': 'Pink Noise',
  'pink_noise': 'Pink Noise',

  'brown-noise': 'Brown Noise',
  'brown_noise': 'Brown Noise',

  'rain': 'Rain',

  'ocean': 'Ocean Waves',
  'ocean-waves': 'Ocean Waves',
  'ocean_waves': 'Ocean Waves',

  'stream': 'Stream',
  'forest': 'Forest',
  'fire': 'Fire',

  'cafe': 'Café Ambience',
  'cafe-ambience': 'Café Ambience',
  'cafe_ambience': 'Café Ambience',

  'binaural-alpha': 'Alpha Waves',
  'alpha': 'Alpha Waves',
  'alpha-waves': 'Alpha Waves',

  'binaural-theta': 'Theta Waves',
  'theta': 'Theta Waves',
  'theta-waves': 'Theta Waves',
};

// Generic fallback for anything not in the table above, so a future/unknown
// identifier degrades to a readable guess instead of showing raw text like
// "guided-imagery-beach".
function humanize(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSessionName(rawName: string): string {
  return SESSION_NAMES[rawName.toLowerCase()] ?? humanize(rawName);
}
