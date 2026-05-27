import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function Index() {
  const { preferences, isLoading } = usePreferences();
  const { colors } = useTheme();

  if (isLoading || !preferences) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.deepTide} />
      </View>
    );
  }

  if (preferences.onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
