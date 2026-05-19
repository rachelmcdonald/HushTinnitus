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
import { AudioManager, PlaybackNotificationManager } from 'react-native-audio-api';
import type AudioEventSubscription from 'react-native-audio-api/lib/typescript/events/AudioEventSubscription';

// ─── Session initialisation ───────────────────────────────────────────────────

export function initAudioSession(): void {
  if (Platform.OS === 'web') return;

  // iOS: 'playback' category keeps audio alive when the screen locks or the
  // app is backgrounded. Combined with UIBackgroundModes: ["audio"] in
  // app.json, this is all that's required on iOS.
  AudioManager.setAudioSessionOptions({
    iosCategory: 'playback',
    iosMode: 'default',
    iosOptions: ['allowAirPlay', 'allowBluetoothA2DP'],
  });

  // Both platforms: observe audio focus so we can handle interruptions (phone
  // calls, navigation prompts, other audio apps) and resume automatically.
  // 'gain' = request persistent audio focus, not transient.
  AudioManager.observeAudioInterruptions('gain');

  // Aggressively reclaim session after interruptions end (e.g. when a phone
  // call finishes). Experimental but appropriate for a continuous audio app.
  AudioManager.activelyReclaimSession(true);
}

// ─── Playback notification ────────────────────────────────────────────────────
// Android: required foreground service notification.
// iOS: populates the lock screen / Control Centre Now Playing widget.

export async function showPlaybackNotification(
  soundName: string,
  state: 'playing' | 'paused'
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await PlaybackNotificationManager.show({
      title: soundName,
      artist: 'Hush Tinnitus',
      state,
    });
    // Enable the controls shown on the notification / lock screen.
    await PlaybackNotificationManager.enableControl('play', state === 'paused');
    await PlaybackNotificationManager.enableControl('pause', state === 'playing');
    await PlaybackNotificationManager.enableControl('stop', true);
  } catch {
    // Non-fatal — if the notification fails (e.g. permission not granted),
    // audio still plays. The foreground service fallback is best-effort.
  }
}

export async function hidePlaybackNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await PlaybackNotificationManager.hide();
  } catch {}
}

// ─── External control subscriptions ──────────────────────────────────────────
// Subscribe to lock screen / notification control events so that tapping
// play/pause/stop on the notification or headphones affects app state.

type ExternalControlHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export function subscribeToExternalControls(
  handlers: ExternalControlHandlers
): () => void {
  if (Platform.OS === 'web') return () => {};

  const subs: AudioEventSubscription[] = [];

  try {
    subs.push(
      PlaybackNotificationManager.addEventListener(
        'playbackNotificationPlay',
        handlers.onPlay
      )
    );
    subs.push(
      PlaybackNotificationManager.addEventListener(
        'playbackNotificationPause',
        handlers.onPause
      )
    );
    subs.push(
      PlaybackNotificationManager.addEventListener(
        'playbackNotificationStop',
        handlers.onStop
      )
    );
  } catch {}

  return () => subs.forEach((s) => s.remove());
}
