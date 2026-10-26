import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { PreferencesProvider } from '@/src/context/PreferencesContext';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { initAudioSession } from '@/src/audio/AudioSession';
import { setupNotificationHandling } from '@/src/notifications/scheduleNotifications';

// Keep the native splash visible. launch.tsx calls hideAsync() after its first
// animation frame renders, so there is no white gap between splash and launch screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppStack() {
  const { isDark } = useTheme();

  // Match the Android navigation bar buttons to the app theme (runs on mount
  // and on every theme change). With edge-to-edge the bar itself is
  // transparent — the screen's own background shows through — and
  // setBackgroundColorAsync is unsupported, so only the button style is set.
  // Requires androidNavigationBar.enforceContrast: false in app.json, otherwise
  // Android draws its translucent white scrim over the bar in light mode.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setStyle(isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // Prevent white frames during navigation transitions.
          contentStyle: { backgroundColor: '#0D4F5C' },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    try { initAudioSession(); } catch {}
    setupNotificationHandling();
    // SplashScreen.hideAsync() is NOT called here — launch.tsx owns that call
    // so the native splash stays visible until launch content is ready to show.
  }, []);

  return (
    <PreferencesProvider>
      <ThemeProvider>
        {/* Root background ensures no white frame is ever visible during
            navigation transitions or before the first screen renders. */}
        <View style={{ flex: 1, backgroundColor: '#0D4F5C' }}>
          <AppStack />
        </View>
      </ThemeProvider>
    </PreferencesProvider>
  );
}
