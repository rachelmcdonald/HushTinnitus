import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PreferencesProvider } from '@/src/context/PreferencesContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { initAudioSession } from '@/src/audio/AudioSession';

function AppStack() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    try { initAudioSession(); } catch {}
  }, []);

  return (
    <PreferencesProvider>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </PreferencesProvider>
  );
}
