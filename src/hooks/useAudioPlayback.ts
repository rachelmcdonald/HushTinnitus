import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SoundSource, SoundSession } from '@/src/types';
import { audioEngine } from '@/src/audio/AudioEngine';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import {
  showPlaybackNotification,
  hidePlaybackNotification,
  subscribeToExternalControls,
} from '@/src/audio/AudioSession';

const FADE_OUT_SECONDS = 10;

// Human-readable names for the notification / Now Playing bar.
const SOUND_NAMES: Record<SoundSource, string> = {
  'white-noise':    'White noise',
  'pink-noise':     'Pink noise',
  'brown-noise':    'Brown noise',
  'rain':           'Rain',
  'ocean':          'Ocean waves',
  'stream':         'Stream',
  'forest':         'Forest',
  'fire':           'Fire',
  'cafe':           'Cafe ambience',
  'binaural-alpha': 'Alpha waves',
  'binaural-theta': 'Theta waves',
};

export function soundDisplayName(id: SoundSource): string {
  return SOUND_NAMES[id] ?? id;
}

export type AudioPlaybackState = {
  currentSound: SoundSource | null;
  isPlaying: boolean;
  isPaused: boolean;
  selectedTimer: number | null;
  timeRemaining: number | null;
  toggle: (id: SoundSource) => void;
  pauseResume: () => Promise<void>;
  stopAll: () => void;
  setTimer: (minutes: number | null) => void;
};

export function useAudioPlayback(): AudioPlaybackState {
  const [currentSound, setCurrentSound] = useState<SoundSource | null>(
    () => audioEngine.currentSound
  );
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const sessionStartRef = useRef<number | null>(null);
  const sessionSoundRef = useRef<SoundSource | null>(null);

  // ─── Notification sync ────────────────────────────────────────────────────

  useEffect(() => {
    if (currentSound) {
      showPlaybackNotification(soundDisplayName(currentSound), isPaused ? 'paused' : 'playing');
    } else {
      hidePlaybackNotification();
    }
  }, [currentSound, isPaused]);

  // ─── External controls (lock screen / notification) ───────────────────────

  useEffect(() => {
    const unsubscribe = subscribeToExternalControls({
      onPlay: () => {
        if (audioEngine.isPaused) {
          audioEngine.resume().then(() => setIsPaused(false));
        }
      },
      onPause: () => {
        if (!audioEngine.isPaused && audioEngine.isPlaying) {
          audioEngine.pause().then(() => setIsPaused(true));
        }
      },
      onStop: () => {
        performStopRef.current?.();
      },
    });
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Session save ─────────────────────────────────────────────────────────

  function saveSession(durationSeconds: number) {
    const sound = sessionSoundRef.current;
    if (Platform.OS === 'web' || !sound || durationSeconds < 1) return;
    try {
      saveSoundSession({
        id: createSessionId(),
        date: new Date().toISOString(),
        sounds: [sound],
        durationSeconds,
        timerMinutes: selectedTimer ?? 0,
        volume: audioEngine.volume,
        balance: 0,
        notchedFrequency: null,
      } as SoundSession);
    } catch {}
  }

  // ─── Core stop ────────────────────────────────────────────────────────────

  const performStop = useCallback(
    (durationOverride?: number) => {
      const duration =
        durationOverride ??
        (sessionStartRef.current
          ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
          : 0);

      if (Platform.OS !== 'web') {
        audioEngine.stop();
      }

      saveSession(duration);

      setCurrentSound(null);
      setIsPaused(false);
      setTimeRemaining(null);
      sessionStartRef.current = null;
      sessionSoundRef.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTimer]
  );

  // Stable ref so external control callbacks can always call the latest version.
  const performStopRef = useRef(performStop);
  useEffect(() => { performStopRef.current = performStop; }, [performStop]);

  // ─── Timer countdown ──────────────────────────────────────────────────────

  useEffect(() => {
    if (timeRemaining === null) return;

    if (timeRemaining === 0) {
      const totalSeconds = selectedTimer ? selectedTimer * 60 : 0;
      performStop(totalSeconds);
      return;
    }

    if (timeRemaining === FADE_OUT_SECONDS && !isPaused) {
      if (Platform.OS !== 'web') audioEngine.startFadeOut(FADE_OUT_SECONDS);
    }

    const tick = setTimeout(
      () => setTimeRemaining((prev) => (prev !== null && !isPaused ? prev - 1 : prev)),
      1000
    );
    return () => clearTimeout(tick);
  }, [timeRemaining, isPaused, performStop, selectedTimer]);

  // ─── Toggle play/stop ─────────────────────────────────────────────────────

  const toggle = useCallback(
    async (soundId: SoundSource) => {
      if (currentSound === soundId && !isPaused) {
        performStop();
        return;
      }

      // Resume if paused on this same sound.
      if (currentSound === soundId && isPaused) {
        audioEngine.resume().then(() => setIsPaused(false));
        return;
      }

      if (currentSound !== null && Platform.OS !== 'web') {
        audioEngine.stop();
        // Brief gap lets the native audio thread finish tearing down the previous
        // sound's nodes before new ones are connected, preventing bleed-through.
        await new Promise<void>(resolve => setTimeout(resolve, 50));
      }

      if (Platform.OS !== 'web') {
        audioEngine.play(soundId);
      }

      sessionStartRef.current = Date.now();
      sessionSoundRef.current = soundId;
      setCurrentSound(soundId);
      setIsPaused(false);
      setTimeRemaining(selectedTimer !== null ? selectedTimer * 60 : null);
    },
    [currentSound, isPaused, selectedTimer, performStop]
  );

  // ─── Pause / resume ───────────────────────────────────────────────────────

  const pauseResume = useCallback(async () => {
    if (!currentSound) return;
    if (isPaused) {
      if (Platform.OS !== 'web') await audioEngine.resume();
      setIsPaused(false);
    } else {
      if (Platform.OS !== 'web') await audioEngine.pause();
      setIsPaused(true);
    }
  }, [currentSound, isPaused]);

  // ─── Stop all ─────────────────────────────────────────────────────────────

  const stopAll = useCallback(() => {
    performStop();
  }, [performStop]);

  // ─── Timer selection ──────────────────────────────────────────────────────

  const setTimer = useCallback(
    (minutes: number | null) => {
      setSelectedTimer(minutes);
      if (currentSound !== null && !isPaused) {
        setTimeRemaining(minutes !== null ? minutes * 60 : null);
        if (minutes !== null && Platform.OS !== 'web') {
          audioEngine.setVolume(audioEngine.volume);
        }
      }
    },
    [currentSound, isPaused]
  );

  return {
    currentSound,
    isPlaying: currentSound !== null,
    isPaused,
    selectedTimer,
    timeRemaining,
    toggle,
    pauseResume,
    stopAll,
    setTimer,
  };
}
