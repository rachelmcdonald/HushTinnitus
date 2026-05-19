// Background audio configuration for Hush Tinnitus.
//
// iOS:  audio session category 'playback' + UIBackgroundModes: ["audio"] in
//       app.json enables audio through screen lock, Control Centre "Now
//       Playing" widget, and AirPlay.
//
// Android: PlaybackNotificationManager.show() creates a foreground service
//       notification, which is mandatory on Android 8+ for any app that
//       continues audio in the background. Without it Android kills the process.
//
// This module is initialised once at app startup from app/_layout.tsx.
// Play/pause/stop controls on the lock screen / notification are wired up here;
// callers provide callbacks so this module stays decoupled from React state.

import { Platform } from 'react-native';

// Type-only import for AudioEventSubscription (used in subscribeToExternalControls).
import type AudioEventSubscription from 'react-native-audio-api/lib/typescript/events/AudioEventSubscription';

// ─── Lazy module loading ──────────────────────────────────────────────────────
// AudioManager and PlaybackNotificationManager are singleton instances exported
// from the package. We load the module lazily to avoid crashing in Expo Go.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AudioSessionModule = Record<string, any>;

let _mod: AudioSessionModule | null = null;
let _modChecked = false;

function loadMod(): AudioSessionModule | null {
  if (_modChecked) return _mod;
  _modChecked = true;
  try {
    _mod = require('react-native-audio-api') as AudioSessionModule;
  } catch {
    _mod = null;
  }
  return _mod;
}

// ─── Session initialisation ───────────────────────────────────────────────────

export function initAudioSession(): void {
  if (Platform.OS === 'web') return;
  const mod = loadMod();
  if (!mod) return; // Expo Go — silently skip, audio won't work anyway

  try {
    // iOS: 'playback' category keeps audio alive when the screen locks.
    // Combined with UIBackgroundModes: ["audio"] in app.json, this is all
    // that is required on iOS.
    mod.AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
      iosOptions: ['allowAirPlay', 'allowBluetoothA2DP'],
    });

    // Both platforms: observe audio focus so we can handle interruptions
    // (phone calls, navigation prompts, other audio apps) and resume.
    mod.AudioManager.observeAudioInterruptions('gain');

    // Aggressively reclaim session after interruptions end.
    mod.AudioManager.activelyReclaimSession(true);
  } catch {
    // Best-effort — never crash the app over session config failures.
  }
}

// ─── Playback notification ────────────────────────────────────────────────────
// Android: required foreground service notification.
// iOS: populates the lock screen / Control Centre Now Playing widget.

export async function showPlaybackNotification(
  soundName: string,
  state: 'playing' | 'paused'
): Promise<void> {
  if (Platform.OS === 'web') return;
  const mod = loadMod();
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
  } catch {
    // Non-fatal — audio still plays if notification fails.
  }
}

export async function hidePlaybackNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  const mod = loadMod();
  if (!mod) return;
  try {
    await mod.PlaybackNotificationManager.hide();
  } catch {}
}

// ─── External control subscriptions ──────────────────────────────────────────

type ExternalControlHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export function subscribeToExternalControls(
  handlers: ExternalControlHandlers
): () => void {
  if (Platform.OS === 'web') return () => {};
  const mod = loadMod();
  if (!mod) return () => {};

  const subs: AudioEventSubscription[] = [];

  try {
    subs.push(
      mod.PlaybackNotificationManager.addEventListener(
        'playbackNotificationPlay',
        handlers.onPlay
      )
    );
    subs.push(
      mod.PlaybackNotificationManager.addEventListener(
        'playbackNotificationPause',
        handlers.onPause
      )
    );
    subs.push(
      mod.PlaybackNotificationManager.addEventListener(
        'playbackNotificationStop',
        handlers.onStop
      )
    );
  } catch {}

  return () => subs.forEach((s) => s.remove());
}
