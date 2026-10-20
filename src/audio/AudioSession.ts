// ─── NO static imports from react-native-audio-api ───────────────────────────
// See AudioEngine.ts for the rationale. Every function that needs the module
// loads it via dynamic import() at call time, never at module-evaluation time.

import { Image, Platform } from 'react-native';

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
    // Audio focus is NOT requested here — on Android, observeAudioInterruptions
    // requests AUDIOFOCUS_GAIN immediately, which would pause Spotify etc. just
    // by opening the app. AudioEngine requests it on the first play instead.
    mod.AudioManager.activelyReclaimSession(true);
  } catch (err) { console.error('[AudioSession] _initAsync FAILED:', err); }
}

// ─── Playback notification ────────────────────────────────────────────────────

// Artwork for the media notification (512×512, solid #0D4F5C). On Android 11+
// and MIUI the media notification also takes its background colour from this.
// { uri } form: resolves to a bundled drawable in release, a Metro URL in dev.
const ARTWORK_URI = Image.resolveAssetSource(require('@/assets/notification-artwork.png')).uri;

export async function showPlaybackNotification(
  soundName: string,
  state: 'playing' | 'paused'
): Promise<void> {
  console.log('[AudioSession] showPlaybackNotification called:', { soundName, state });

  if (Platform.OS === 'web') {
    console.log('[AudioSession] showPlaybackNotification: skipped (web)');
    return;
  }
  const mod = await loadMod();
  if (!mod) {
    console.log('[AudioSession] showPlaybackNotification: skipped (native module not loaded)');
    return;
  }
  try {
    console.log('[AudioSession] PlaybackNotificationManager.show() →', { title: soundName, artist: 'Hush Tinnitus', state, artwork: ARTWORK_URI });
    await mod.PlaybackNotificationManager.show({
      title: soundName,
      artist: 'Hush Tinnitus',
      state,
      artwork: { uri: ARTWORK_URI },
    });
    console.log('[AudioSession] PlaybackNotificationManager.show() resolved');

    const isActive = await mod.PlaybackNotificationManager.isActive();
    console.log('[AudioSession] PlaybackNotificationManager.isActive() →', isActive);

    console.log('[AudioSession] enableControl(play) →', state === 'paused');
    await mod.PlaybackNotificationManager.enableControl('play', state === 'paused');

    console.log('[AudioSession] enableControl(pause) →', state === 'playing');
    await mod.PlaybackNotificationManager.enableControl('pause', state === 'playing');

    console.log('[AudioSession] enableControl(stop) →', true);
    await mod.PlaybackNotificationManager.enableControl('stop', true);

    console.log('[AudioSession] showPlaybackNotification: all controls enabled successfully');
  } catch (err) {
    console.error('[AudioSession] showPlaybackNotification FAILED:', err);
  }
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
  /** Another app took audio focus (e.g. Spotify started playing, phone call). */
  onInterruptionBegan: () => void;
};

// Subscription type is local — no import from react-native-audio-api needed.
type Subscription = { remove(): void };

export function subscribeToExternalControls(
  handlers: ExternalControlHandlers
): () => void {
  console.log('[AudioSession] subscribeToExternalControls called');
  if (Platform.OS === 'web') return () => {};

  const subs: Subscription[] = [];

  loadMod().then((mod) => {
    if (!mod) {
      console.log('[AudioSession] subscribeToExternalControls: native module NOT loaded — no listeners attached');
      return;
    }
    console.log('[AudioSession] subscribeToExternalControls: module loaded', {
      hasPlaybackNotificationManager: !!mod.PlaybackNotificationManager,
      hasGlobalAudioEventEmitter: !!(global as any).AudioEventEmitter,
    });

    // Event names verified against react-native-audio-api@0.12.2
    // (src/system/notification/types.ts and common/cpp/.../JsEnumParser.cpp).
    const listeners: [string, () => void][] = [
      ['playbackNotificationPlay',  handlers.onPlay],
      ['playbackNotificationPause', handlers.onPause],
      ['playbackNotificationStop',  handlers.onStop],
    ];
    for (const [eventName, handler] of listeners) {
      try {
        console.log('[AudioSession] addEventListener →', eventName);
        const sub = mod.PlaybackNotificationManager.addEventListener(eventName, () => {
          console.log('[AudioSession] event received:', eventName);
          handler();
        });
        subs.push(sub);
        console.log('[AudioSession] addEventListener OK:', eventName, sub);
      } catch (err) {
        console.error('[AudioSession] addEventListener FAILED:', eventName, err);
      }
    }
    console.log('[AudioSession] subscribeToExternalControls: subscribed', subs.length, 'of', listeners.length);

    // Audio focus loss. On Android the library emits 'interruption' with
    // type 'began' on AUDIOFOCUS_LOSS / LOSS_TRANSIENT (only while we hold focus,
    // which AudioEngine requests on each play/resume) and type 'ended' when focus
    // returns. We pause on 'began' and deliberately ignore 'ended' — no
    // auto-resume; the user taps play to continue. 'duck' (transient
    // can-duck, e.g. a notification sound) is left to Android's automatic ducking.
    try {
      const sub = mod.AudioManager.addSystemEventListener(
        'interruption',
        (event: { type: 'began' | 'ended'; shouldResume: boolean }) => {
          console.log('[AudioSession] interruption event received:', event);
          if (event.type === 'began') handlers.onInterruptionBegan();
        }
      );
      subs.push(sub);
      console.log('[AudioSession] addSystemEventListener OK: interruption');
    } catch (err) {
      console.error('[AudioSession] addSystemEventListener FAILED: interruption', err);
    }
  }).catch((err) => console.error('[AudioSession] subscribeToExternalControls loadMod FAILED:', err));

  return () => subs.forEach((s) => s.remove());
}
