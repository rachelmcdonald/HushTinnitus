// ─── NO static imports from react-native-audio-api ───────────────────────────
// See AudioEngine.ts for the rationale. Every function that needs the module
// loads it via dynamic import() at call time, never at module-evaluation time.

import { Platform } from 'react-native';

// ─── Lazy module cache ────────────────────────────────────────────────────────

let _mod: any = null;
let _modLoaded = false;

async function loadMod(): Promise<any> {
  if (_modLoaded) return _mod;
  _modLoaded = true;
  try {
    _mod = await import('react-native-audio-api');
  } catch {
    _mod = null;
  }
  return _mod;
}

// ─── Session initialisation ───────────────────────────────────────────────────

// Called from app/_layout.tsx. Returns void immediately; async work runs in
// the background. Failures are silent — never crash the app over session config.
export function initAudioSession(): void {
  if (Platform.OS === 'web') return;
  _initAsync().catch(() => {});
}

async function _initAsync(): Promise<void> {
  const mod = await loadMod();
  if (!mod) return;
  try {
    mod.AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
      iosOptions: ['allowAirPlay', 'allowBluetoothA2DP'],
    });
    mod.AudioManager.observeAudioInterruptions('gain');
    mod.AudioManager.activelyReclaimSession(true);
  } catch {}
}

// ─── Playback notification ────────────────────────────────────────────────────

export async function showPlaybackNotification(
  soundName: string,
  state: 'playing' | 'paused'
): Promise<void> {
  if (Platform.OS === 'web') return;
  const mod = await loadMod();
  if (!mod) return;
  try {
    await mod.PlaybackNotificationManager.show({
      title: soundName,
      artist: 'Hush Tinnitus',
      state,
    });
    await mod.PlaybackNotificationManager.enableControl('play', state === 'paused');
    await mod.PlaybackNotificationManager.enableControl('pause', state === 'playing');
    await mod.PlaybackNotificationManager.enableControl('stop', true);
  } catch {}
}

export async function hidePlaybackNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  const mod = await loadMod();
  if (!mod) return;
  try { await mod.PlaybackNotificationManager.hide(); } catch {}
}

// ─── External control subscriptions ──────────────────────────────────────────

type ExternalControlHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

// Subscription type is local — no import from react-native-audio-api needed.
type Subscription = { remove(): void };

export function subscribeToExternalControls(
  handlers: ExternalControlHandlers
): () => void {
  if (Platform.OS === 'web') return () => {};

  const subs: Subscription[] = [];

  loadMod().then((mod) => {
    if (!mod) return;
    try {
      subs.push(mod.PlaybackNotificationManager.addEventListener('playbackNotificationPlay',  handlers.onPlay));
      subs.push(mod.PlaybackNotificationManager.addEventListener('playbackNotificationPause', handlers.onPause));
      subs.push(mod.PlaybackNotificationManager.addEventListener('playbackNotificationStop',  handlers.onStop));
    } catch {}
  }).catch(() => {});

  return () => subs.forEach((s) => s.remove());
}
