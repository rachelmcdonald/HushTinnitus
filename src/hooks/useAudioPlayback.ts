import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SoundSource, SoundSession } from '@/src/types';
import { audioEngine } from '@/src/audio/AudioEngine';
import { saveSoundSession, createSessionId } from '@/src/storage/soundSessions';

const FADE_OUT_SECONDS = 10;

export type AudioPlaybackState = {
  currentSound: SoundSource | null;
  isPlaying: boolean;
  selectedTimer: number | null;   // chosen duration in minutes (null = no timer)
  timeRemaining: number | null;   // countdown in seconds (null = timer not active)
  toggle: (id: SoundSource) => void;
  stopAll: () => void;
  setTimer: (minutes: number | null) => void;
};

export function useAudioPlayback(): AudioPlaybackState {
  const [currentSound, setCurrentSound] = useState<SoundSource | null>(
    () => audioEngine.currentSound
  );
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Wall-clock start of the current session — used to compute durationSeconds.
  const sessionStartRef = useRef<number | null>(null);
  // The sound playing when the session started (needed for the DB record).
  const sessionSoundRef = useRef<SoundSource | null>(null);

  // ─── Session save helper ─────────────────────────────────────────────────

  function saveSession(durationSeconds: number) {
    const sound = sessionSoundRef.current;
    if (Platform.OS === 'web' || !sound || durationSeconds < 1) return;
    try {
      const session: SoundSession = {
        id: createSessionId(),
        date: new Date().toISOString(),
        sounds: [sound],
        durationSeconds,
        timerMinutes: selectedTimer ?? 0,
        volume: audioEngine.volume,
        balance: 0,
        notchedFrequency: null,
      };
      saveSoundSession(session);
    } catch {
      // Non-critical — never crash the UI over a failed session write.
    }
  }

  // ─── Core stop ───────────────────────────────────────────────────────────

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
      setTimeRemaining(null);
      sessionStartRef.current = null;
      sessionSoundRef.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTimer]
  );

  // ─── Timer countdown ─────────────────────────────────────────────────────

  useEffect(() => {
    if (timeRemaining === null) return;

    if (timeRemaining === 0) {
      // Fade already started at timeRemaining === FADE_OUT_SECONDS.
      // Now the fade is complete — stop and save.
      const totalSeconds = selectedTimer ? selectedTimer * 60 : 0;
      performStop(totalSeconds);
      return;
    }

    if (timeRemaining === FADE_OUT_SECONDS) {
      // Start the gentle 10-second fade-out.
      if (Platform.OS !== 'web') {
        audioEngine.startFadeOut(FADE_OUT_SECONDS);
      }
    }

    const tick = setTimeout(
      () => setTimeRemaining((prev) => (prev !== null ? prev - 1 : null)),
      1000
    );
    return () => clearTimeout(tick);
  }, [timeRemaining, performStop, selectedTimer]);

  // ─── Toggle play/stop ────────────────────────────────────────────────────

  const toggle = useCallback(
    (soundId: SoundSource) => {
      if (currentSound === soundId) {
        performStop();
        return;
      }

      // Stop any currently playing sound first (different sound tapped).
      if (currentSound !== null && Platform.OS !== 'web') {
        audioEngine.stop();
      }

      // Start the new sound.
      if (Platform.OS !== 'web') {
        audioEngine.play(soundId);
      }

      sessionStartRef.current = Date.now();
      sessionSoundRef.current = soundId;
      setCurrentSound(soundId);

      // Kick off the countdown if a timer is selected.
      setTimeRemaining(selectedTimer !== null ? selectedTimer * 60 : null);
    },
    [currentSound, selectedTimer, performStop]
  );

  // ─── Stop all ────────────────────────────────────────────────────────────

  const stopAll = useCallback(() => {
    performStop();
  }, [performStop]);

  // ─── Timer selection ─────────────────────────────────────────────────────

  const setTimer = useCallback(
    (minutes: number | null) => {
      setSelectedTimer(minutes);
      // If audio is already playing, restart the countdown with the new duration.
      if (currentSound !== null) {
        setTimeRemaining(minutes !== null ? minutes * 60 : null);
        if (minutes !== null && Platform.OS !== 'web') {
          // Re-set gain to full volume in case a previous fade was in progress.
          audioEngine.setVolume(audioEngine.volume);
        }
      }
    },
    [currentSound]
  );

  return {
    currentSound,
    isPlaying: currentSound !== null,
    selectedTimer,
    timeRemaining,
    toggle,
    stopAll,
    setTimer,
  };
}
