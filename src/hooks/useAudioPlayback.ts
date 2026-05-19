import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { audioEngine, NoiseType } from '@/src/audio/AudioEngine';

type AudioPlaybackState = {
  currentNoise: NoiseType | null;
  isPlaying: boolean;
  toggle: (type: NoiseType) => void;
  stopAll: () => void;
};

export function useAudioPlayback(): AudioPlaybackState {
  // Initialise from engine so state survives tab navigation.
  const [currentNoise, setCurrentNoise] = useState<NoiseType | null>(
    () => audioEngine.currentNoise
  );

  // Sync in case the engine was mutated outside React (e.g. background stop).
  useEffect(() => {
    setCurrentNoise(audioEngine.currentNoise);
  }, []);

  const toggle = useCallback((type: NoiseType) => {
    if (Platform.OS === 'web') {
      // Web: toggle state only — react-native-audio-api has a web shim
      // but AudioContext may not be available in all test environments.
      setCurrentNoise((prev) => (prev === type ? null : type));
      return;
    }

    if (audioEngine.currentNoise === type) {
      audioEngine.stop();
      setCurrentNoise(null);
    } else {
      audioEngine.play(type);
      setCurrentNoise(type);
    }
  }, []);

  const stopAll = useCallback(() => {
    if (Platform.OS !== 'web') {
      audioEngine.stop();
    }
    setCurrentNoise(null);
  }, []);

  return {
    currentNoise,
    isPlaying: currentNoise !== null,
    toggle,
    stopAll,
  };
}
