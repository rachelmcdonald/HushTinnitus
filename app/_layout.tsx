import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/src/theme';
import { PreferencesProvider } from '@/src/context/PreferencesContext';
import { initAudioSession } from '@/src/audio/AudioSession';

export default function RootLayout() {
  useEffect(() => {
    // Configure background audio session once on app startup.
    // iOS: sets category 'playback' so audio survives screen lock.
    // Android: enables interruption handling and foreground service support.
    initAudioSession();
  }, []);

  return (
    <PreferencesProvider>
      <StatusBar style="dark" backgroundColor={Colors.warmSand} />
      <Stack screenOptions={{ headerShown: false }} />
    </PreferencesProvider>
  );
}
