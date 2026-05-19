import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/src/theme';
import { PreferencesProvider } from '@/src/context/PreferencesContext';

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <StatusBar style="dark" backgroundColor={Colors.warmSand} />
      <Stack screenOptions={{ headerShown: false }} />
    </PreferencesProvider>
  );
}
