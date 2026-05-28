import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { PreferencesProvider } from '@/src/context/PreferencesContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { initAudioSession } from '@/src/audio/AudioSession';

// Keep the splash visible until providers are mounted and SQLite preferences
// are loaded (synchronous — happens during provider initialisation).
SplashScreen.preventAutoHideAsync().catch(() => {});

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
    SplashScreen.hideAsync();
  }, []);

  return (
    <PreferencesProvider>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </PreferencesProvider>
  );
}
