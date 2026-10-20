import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SoundSource, SoundSession } from '@/src/types';
import { audioEngine } from '@/src/audio/AudioEngine';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';
import { formatSessionName } from '@/src/utils/formatSessionName';
import {
  showPlaybackNotification,
  hidePlaybackNotification,
  subscribeToExternalControls,
} from '@/src/audio/AudioSession';

const FADE_OUT_SECONDS = 10;

// Human-readable name for the notification / Now Playing bar — backed by the
// same lookup table used for the Home tab's recent sessions list, so a sound
// is named identically everywhere it appears.
export function soundDisplayName(id: SoundSource): string {
  return formatSessionName(id);
}

export type AudioPlaybackState = {
  currentSound: SoundSource | null;
  isPlaying: boolean;
  isPaused: boolean;
  /** True from a tap on a sound until its audio is actually audible. */
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  // Identifies the latest play request, so a slow load that was superseded by
  // another tap (or a stop) can't clear the newer request's loading state.
  const playRequestRef = useRef(0);
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
      // Another app took audio focus: pause (the notification-sync effect then
      // shows the paused state; the notification stays so the user can resume).
      // No auto-resume when focus returns — the user taps play.
      onInterruptionBegan: () => {
        if (!audioEngine.isPaused && audioEngine.isPlaying) {
          audioEngine.pause().then(() => setIsPaused(true));
        }
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
      playRequestRef.current++;
      setIsLoading(false);

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
        await new Promise<void>(resolve => setTimeout(resolve, 10));
      }

      if (Platform.OS !== 'web') {
        // The card shows a spinner (isLoading) until the file is loaded and the
        // audio has actually started, rather than "playing" while still silent.
        const request = ++playRequestRef.current;
        setIsLoading(true);
        audioEngine.play(soundId).then(() => {
          if (request === playRequestRef.current) setIsLoading(false);
        });
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
    // Ignore while the sound is still loading: the engine has no current sound
    // yet, so pause() would be a no-op and the UI would show paused over audio.
    if (!currentSound || isLoading) return;
    if (isPaused) {
      if (Platform.OS !== 'web') await audioEngine.resume();
      setIsPaused(false);
    } else {
      if (Platform.OS !== 'web') await audioEngine.pause();
      setIsPaused(true);
    }
  }, [currentSound, isPaused, isLoading]);

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
    isLoading,
    selectedTimer,
    timeRemaining,
    toggle,
    pauseResume,
    stopAll,
    setTimer,
  };
}
